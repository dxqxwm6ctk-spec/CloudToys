import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, ordersTable, paymentMethodsTable, productsTable, adminSettingsTable, profilesTable } from "@workspace/db";
import { TrackOrderParams, TrackOrderResponse } from "@workspace/api-zod";
import * as z from "zod";
import { requireCustomer } from "../lib/supabaseAuth";
import { verifyTurnstileToken } from "../lib/turnstile";
import { buildSteps } from "../lib/orderStatus";

const router: IRouter = Router();

class InsufficientStockError extends Error {}

const DELIVERY_DAYS_KEY = "default_delivery_days";
const DEFAULT_DELIVERY_DAYS = 7;

/** Admin-configurable default delivery window (days), falling back to 7 if unset. */
async function getDefaultDeliveryDays(): Promise<number> {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.key, DELIVERY_DAYS_KEY));
  const days = row ? Number(row.value) : DEFAULT_DELIVERY_DAYS;
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_DELIVERY_DAYS;
}

// ── Payment methods (public – for checkout) ────────────────────────────────
router.get("/orders/payment-methods", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .orderBy(paymentMethodsTable.id);

  res.json(
    rows.map((m) => ({
      id: String(m.id),
      key: m.key,
      label: m.label,
      description: m.description ?? null,
      enabled: m.enabled,
    })),
  );
});

// ── Create order ───────────────────────────────────────────────────────────
const CreateOrderBody = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  paymentMethodKey: z.string().min(1),
  shippingAddress: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    }),
  ).min(1),
});

router.post("/orders", requireCustomer, async (req, res): Promise<void> => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { customerName, customerEmail, paymentMethodKey, shippingAddress, items } =
    body.data;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Validate payment method is enabled
  const [pm] = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.key, paymentMethodKey));

  if (!pm || !pm.enabled) {
    res.status(400).json({ error: "Selected payment method is not available" });
    return;
  }

  // Combine duplicate line items for the same product before checking stock
  const quantityByProductId = new Map<number, number>();
  for (const item of items) {
    const productId = Number(item.productId);
    if (!Number.isInteger(productId)) {
      res.status(400).json({ error: `Invalid product id: ${item.productId}` });
      return;
    }
    quantityByProductId.set(
      productId,
      (quantityByProductId.get(productId) ?? 0) + item.quantity,
    );
  }

  // Estimated delivery: admin-configurable number of days from now (defaults to 7)
  const defaultDeliveryDays = await getDefaultDeliveryDays();
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + defaultDeliveryDays);
  const estimatedDelivery = deliveryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const steps = [
    { label: "Order Placed", completed: true, date: todayStr },
    { label: "Payment Confirmed", completed: true, date: todayStr },
    { label: "Shipped", completed: false, date: null },
    { label: "Out for Delivery", completed: false, date: null },
    { label: "Delivered", completed: false, date: null },
  ];

  try {
    // Insert with a temporary placeholder (orderNumber is NOT NULL + UNIQUE),
    // then rewrite it using the row's own serial id so the final order number
    // is short, sequential, and easy for customers to read back over the
    // phone or type into the tracking page (e.g. "CT-100042").
    const orderNumber = await db.transaction(async (tx) => {
      // Lock the affected product rows and decrement stock atomically —
      // `stockQuantity - qty >= 0` in the WHERE clause means a row that
      // doesn't have enough stock simply won't update, so we can detect
      // insufficient stock by checking rowCount instead of racing a
      // separate SELECT + UPDATE (which two concurrent checkouts could
      // both pass).
      for (const [productId, quantity] of quantityByProductId) {
        const result = await tx
          .update(productsTable)
          .set({
            stockQuantity: sql`${productsTable.stockQuantity} - ${quantity}`,
            inStock: sql`(${productsTable.stockQuantity} - ${quantity}) > 0`,
          })
          .where(
            sql`${productsTable.id} = ${productId} AND ${productsTable.stockQuantity} >= ${quantity}`,
          );

        if (result.rowCount === 0) {
          const [product] = await tx
            .select({ name: productsTable.name, stockQuantity: productsTable.stockQuantity })
            .from(productsTable)
            .where(eq(productsTable.id, productId));

          throw new InsufficientStockError(
            product
              ? `Only ${product.stockQuantity} left of "${product.name}"`
              : `Product ${productId} not found`,
          );
        }
      }

      const [inserted] = await tx
        .insert(ordersTable)
        .values({
          orderNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          status: "processing",
          estimatedDelivery,
          steps,
          customerName,
          customerEmail,
          userId: req.customer!.id,
          paymentMethod: pm.label,
          shippingAddress: shippingAddress ?? null,
          items,
          total: String(total),
        })
        .returning({ id: ordersTable.id });

      const finalOrderNumber = `CT-${100000 + inserted.id}`;
      await tx
        .update(ordersTable)
        .set({ orderNumber: finalOrderNumber })
        .where(eq(ordersTable.id, inserted.id));

      return finalOrderNumber;
    });

    res.status(201).json({ orderNumber, estimatedDelivery });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ── Track order ────────────────────────────────────────────────────────────
router.get("/orders/:orderNumber/track", async (req, res): Promise<void> => {
  const params = TrackOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, params.data.orderNumber));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(
    TrackOrderResponse.parse({
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      steps: order.steps,
    }),
  );
});

export default router;
