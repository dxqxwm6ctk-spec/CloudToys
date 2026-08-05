import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Internal admin-dashboard staff accounts (as opposed to `profiles`, which
 * are storefront customers). Supports three roles with different access:
 *
 *  - "admin"      — full access, including managing other staff accounts
 *  - "manager"    — day-to-day store operations (products, orders, etc.),
 *                   no access to security settings, payment method config,
 *                   or staff management
 *  - "supervisor" — read-only across the dashboard, can update order status
 *
 * `passwordHash` is a salted scrypt hash (`scryptHash:salt`), not a plain
 * password. The very first admin account is auto-seeded from the legacy
 * ADMIN_USERNAME/ADMIN_PASSWORD env vars on first login if this table is
 * empty — see lib/adminAuth.ts.
 */
export const adminRoles = ["admin", "manager", "supervisor"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminStaffTable = pgTable("admin_staff", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<AdminRole>(),
  active: boolean("active").notNull().default(true),
  /**
   * Optional Google account email used to match "Sign in with Google" on
   * the admin dashboard, independent of `username` (which can be any
   * display name). Stored lowercase; nullable because password-only staff
   * don't need one. See artifacts/api-server/src/routes/adminAuth.ts.
   */
  email: text("email").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const insertAdminStaffSchema = createInsertSchema(adminStaffTable).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});
export type InsertAdminStaff = z.infer<typeof insertAdminStaffSchema>;
export type AdminStaff = typeof adminStaffTable.$inferSelect;
