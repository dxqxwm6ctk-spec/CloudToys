import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * IP addresses an admin has explicitly blocked. Checked on every request
 * (via a short-lived in-memory cache — see lib/security.ts) before it
 * reaches any route, so a blocked IP is rejected immediately with 403.
 */
export const blockedIpsTable = pgTable("blocked_ips", {
  ip: text("ip").primaryKey(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BlockedIp = typeof blockedIpsTable.$inferSelect;
