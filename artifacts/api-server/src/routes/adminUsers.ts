/**
 * Admin customer management — list every signed-up customer (from Supabase
 * Auth, merged with local profile + order data), view a single customer's
 * detail/order history, and ban/unban their account.
 */
import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";
import { db, profilesTable, ordersTable } from "@workspace/db";
import { requireRole } from "../middleware/requireAdmin";
import { logger } from "../lib/logger";
import { isOrderDeletable } from "../lib/orderStatus";

const router: IRouter = Router();

let _adminAuthClient: ReturnType<typeof createClient> | null = null;

function getAdminAuthClient() {
  if (_adminAuthClient) return _adminAuthClient;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL not set.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set.");
  _adminAuthClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _adminAuthClient;
}

// A permanent-enough ban: Supabase's Admin API takes a duration, not a
// boolean, so this blocks new token issuance/refresh for ~100 years.
// Our own `profiles.banned` flag (checked in requireCustomer) is the real
// source of truth and takes effect immediately on already-issued tokens.
const BAN_DURATION = "876600h";
const UNBAN_DURATION = "none";

// ── List customers ───────────────────────────────────────────────────────
router.get("/admin/users", async (_req, res): Promise<void> => {
  const authClient = getAdminAuthClient();

  // Supabase Admin API paginates; the storefront's customer base is small
  // enough that a couple of pages covers it comfortably.
  const authUsers: { id: string; email: string | null; createdAt: string | null; lastSignInAt: string | null }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await authClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      logger.error({ error }, "Failed to list Supabase auth users");
      res.status(502).json({ error: "Failed to load users from auth provider" });
      return;
    }
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: u.email ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 200) break;
  }

  const [profileRows, orderStats] = await Promise.all([
    db
      .select({
        id: profilesTable.id,
        fullName: profilesTable.fullName,
        phone: profilesTable.phone,
        banned: profilesTable.banned,
        bannedReason: profilesTable.bannedReason,
        bannedAt: profilesTable.bannedAt,
      })
      .from(profilesTable),
    db
      .select({
        userId: ordersTable.userId,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
        lastOrderAt: sql<string | null>`max(${ordersTable.createdAt})`,
      })
      .from(ordersTable)
      .where(sql`${ordersTable.userId} IS NOT NULL`)
      .groupBy(ordersTable.userId),
  ]);

  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const statsById = new Map(orderStats.map((s) => [s.userId as string, s]));

  res.json(
    authUsers
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .map((u) => {
        const profile = profileById.get(u.id);
        const stats = statsById.get(u.id);
        return {
          id: u.id,
          email: u.email ?? profile?.fullName ?? null,
          fullName: profile?.fullName ?? null,
          phone: profile?.phone ?? null,
          createdAt: u.createdAt,
          lastSignInAt: u.lastSignInAt,
          banned: profile?.banned ?? false,
          bannedReason: profile?.bannedReason ?? null,
          bannedAt: profile?.bannedAt ? profile.bannedAt.toISOString() : null,
          orderCount: stats?.orderCount ?? 0,
          totalSpent: stats ? Number(stats.totalSpent) : 0,
          lastOrderAt: stats?.lastOrderAt ?? null,
        };
      }),
  );
});

// ── Customer detail (profile + order history) ───────────────────────────
const UserIdParams = z.object({ id: z.string().uuid() });

router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const params = UserIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const authClient = getAdminAuthClient();
  const { data, error } = await authClient.auth.admin.getUserById(params.data.id);
  if (error || !data.user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));

  const orders = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      status: ordersTable.status,
      total: ordersTable.total,
      shippingFee: ordersTable.shippingFee,
      items: ordersTable.items,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.userId, params.data.id))
    .orderBy(sql`${ordersTable.createdAt} DESC NULLS LAST`);

  res.json({
    id: data.user.id,
    email: data.user.email ?? null,
    createdAt: data.user.created_at ?? null,
    lastSignInAt: data.user.last_sign_in_at ?? null,
    fullName: profile?.fullName ?? null,
    phone: profile?.phone ?? null,
    address: profile?.address ?? null,
    banned: profile?.banned ?? false,
    bannedReason: profile?.bannedReason ?? null,
    bannedAt: profile?.bannedAt ? profile.bannedAt.toISOString() : null,
    orders: orders.map((o) => ({
      id: String(o.id),
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total != null ? Number(o.total) : 0,
      shippingFee: o.shippingFee != null ? Number(o.shippingFee) : 0,
      items: o.items ?? null,
      createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    })),
  });
});

// ── Order removal from customer details ──────────────────────────────────
const UserOrderParams = z.object({
  userId: z.string().uuid(),
  orderId: z.coerce.number().int().positive(),
});

const UserOrderItemParams = UserOrderParams.extend({
  productId: z.string().min(1),
});

async function getEditableUserOrder(userId: string, orderId: number) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(sql`${ordersTable.id} = ${orderId} AND ${ordersTable.userId} = ${userId}`);

  if (!order) return { error: "Order not found", status: 404 as const };
  if (!isOrderDeletable(order.status)) {
    return {
      error: "Orders cannot be changed after shipping or dispatch",
      status: 409 as const,
    };
  }
  return { order };
}

router.delete(
  "/admin/users/:userId/orders/:orderId",
  requireRole("admin", "manager"),
  async (req, res): Promise<void> => {
    const params = UserOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const result = await getEditableUserOrder(params.data.userId, params.data.orderId);
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    await db
      .delete(ordersTable)
      .where(eq(ordersTable.id, params.data.orderId));

    res.json({ success: true, orderNumber: result.order.orderNumber });
  },
);

router.delete(
  "/admin/users/:userId/orders/:orderId/items/:productId",
  requireRole("admin", "manager"),
  async (req, res): Promise<void> => {
    const params = UserOrderItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const result = await getEditableUserOrder(params.data.userId, params.data.orderId);
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const currentItems = Array.isArray(result.order.items) ? result.order.items : [];
    const removedItem = currentItems.find(
      (item) => String(item.productId) === params.data.productId,
    );
    if (!removedItem) {
      res.status(404).json({ error: "Order item not found" });
      return;
    }

    if (currentItems.length === 1) {
      await db.delete(ordersTable).where(eq(ordersTable.id, params.data.orderId));
      res.json({
        success: true,
        orderNumber: result.order.orderNumber,
        orderDeleted: true,
      });
      return;
    }

    const remainingItems = currentItems.filter(
      (item) => String(item.productId) !== params.data.productId,
    );
    const removedAmount = Number(removedItem.price) * removedItem.quantity;
    const currentTotal = result.order.total != null ? Number(result.order.total) : null;
    const nextTotal =
      currentTotal == null
        ? remainingItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) +
          (result.order.shippingFee != null ? Number(result.order.shippingFee) : 0)
        : Math.max(0, currentTotal - removedAmount);

    await db
      .update(ordersTable)
      .set({
        items: remainingItems,
        total: String(nextTotal),
      })
      .where(eq(ordersTable.id, params.data.orderId));

    res.json({
      success: true,
      orderNumber: result.order.orderNumber,
      orderDeleted: false,
      total: nextTotal,
      items: remainingItems,
    });
  },
);

// ── Ban / unban ───────────────────────────────────────────────────────────
const BanBody = z.object({ reason: z.string().trim().max(500).optional() });

router.post("/admin/users/:id/ban", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UserIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = BanBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await db
    .insert(profilesTable)
    .values({
      id: params.data.id,
      banned: true,
      bannedReason: body.data.reason ?? null,
      bannedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: { banned: true, bannedReason: body.data.reason ?? null, bannedAt: new Date() },
    });

  try {
    await getAdminAuthClient().auth.admin.updateUserById(params.data.id, {
      ban_duration: BAN_DURATION,
    });
  } catch (err) {
    // Our own `profiles.banned` check already blocks the account on its next
    // request regardless — this is a best-effort extra layer to stop new
    // token refreshes too.
    logger.error({ err, userId: params.data.id }, "Failed to ban user via Supabase Admin API");
  }

  res.json({ id: params.data.id, banned: true });
});

router.post("/admin/users/:id/unban", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UserIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .insert(profilesTable)
    .values({ id: params.data.id, banned: false, bannedReason: null, bannedAt: null })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: { banned: false, bannedReason: null, bannedAt: null },
    });

  try {
    await getAdminAuthClient().auth.admin.updateUserById(params.data.id, {
      ban_duration: UNBAN_DURATION,
    });
  } catch (err) {
    logger.error({ err, userId: params.data.id }, "Failed to unban user via Supabase Admin API");
  }

  res.json({ id: params.data.id, banned: false });
});

export default router;
