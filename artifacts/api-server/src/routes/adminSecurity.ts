/**
 * Admin security dashboard — recent abuse/rate-limit events plus the
 * IP block list, so an admin can see who's hammering the store and cut
 * them off without touching code.
 */
import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import * as z from "zod";
import { db, securityEventsTable, blockedIpsTable } from "@workspace/db";
import { invalidateBlockedIpCache } from "../lib/security";

const router: IRouter = Router();

// ── Recent events, grouped by IP ─────────────────────────────────────────
router.get("/admin/security/events", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(securityEventsTable)
    .orderBy(desc(securityEventsTable.createdAt))
    .limit(200);

  res.json(
    rows.map((e) => ({
      id: e.id,
      ip: e.ip,
      method: e.method,
      path: e.path,
      reason: e.reason,
      userId: e.userId,
      email: e.email,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.get("/admin/security/summary", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      ip: securityEventsTable.ip,
      count: sql<number>`count(*)::int`,
      lastSeen: sql<string>`max(${securityEventsTable.createdAt})`,
      reasons: sql<string[]>`array_agg(distinct ${securityEventsTable.reason})`,
    })
    .from(securityEventsTable)
    .where(sql`${securityEventsTable.createdAt} > now() - interval '7 days'`)
    .groupBy(securityEventsTable.ip)
    .orderBy(sql`count(*) desc`)
    .limit(50);

  res.json(rows);
});

// ── Blocked IPs ───────────────────────────────────────────────────────────
router.get("/admin/security/blocked-ips", async (_req, res): Promise<void> => {
  const rows = await db.select().from(blockedIpsTable).orderBy(desc(blockedIpsTable.createdAt));
  res.json(
    rows.map((r) => ({
      ip: r.ip,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

const BlockIpBody = z.object({
  ip: z.string().min(3).max(64),
  reason: z.string().trim().max(500).optional(),
});

router.post("/admin/security/blocked-ips", async (req, res): Promise<void> => {
  const body = BlockIpBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await db
    .insert(blockedIpsTable)
    .values({ ip: body.data.ip, reason: body.data.reason ?? null })
    .onConflictDoUpdate({
      target: blockedIpsTable.ip,
      set: { reason: body.data.reason ?? null },
    });
  await invalidateBlockedIpCache();
  res.status(201).json({ ip: body.data.ip });
});

const IpParams = z.object({ ip: z.string().min(3).max(64) });

router.delete("/admin/security/blocked-ips/:ip", async (req, res): Promise<void> => {
  const params = IpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(blockedIpsTable).where(eq(blockedIpsTable.ip, params.data.ip));
  await invalidateBlockedIpCache();
  res.status(204).end();
});

export default router;
