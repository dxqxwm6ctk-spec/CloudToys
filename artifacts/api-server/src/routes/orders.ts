import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, paymentMethodsTable } from "@workspace/db";
import { TrackOrderParams, TrackOrderResponse } from "@workspace/api-zod";
import * as z from "zod";

const router: IRouter = Router();

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

router.post("/orders", async (req, res): Promise<void> => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { customerName, customerEmail, paymentMethodKey } = body.data;

  // Validate payment method is enabled
  const [pm] = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.key, paymentMethodKey));

  if (!pm || !pm.enabled) {
    res.status(400).json({ error: "Selected payment method is not available" });
    return;
  }

  // Estimated delivery: 7 days from now
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
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

  // Insert with a temporary placeholder (orderNumber is NOT NULL + UNIQUE),
  // then rewrite it using the row's own serial id so the final order number
  // is short, sequential, and easy for customers to read back over the
  // phone or type into the tracking page (e.g. "CT-100042").
  const orderNumber = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(ordersTable)
      .values({
        orderNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "processing",
        estimatedDelivery,
        steps,
        customerName,
        customerEmail,
        paymentMethod: pm.label,
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
