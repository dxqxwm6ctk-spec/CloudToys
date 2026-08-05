import { pgTable, text, serial, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Abuse/security audit log — one row per suspicious request (rate-limit hit,
 * repeated checkout attempt, order-number enumeration, etc). Written
 * best-effort by `lib/security.ts`; never blocks the request that triggered
 * it. Surfaced to admins on the "Security" dashboard page so they can see
 * who's hammering the store and block them (by account or by IP).
 */
export const securityEventsTable = pgTable("security_events", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  reason: text("reason").notNull(),
  userId: uuid("user_id"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SecurityEvent = typeof securityEventsTable.$inferSelect;
