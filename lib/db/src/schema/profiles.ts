import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Customer profile, keyed by the Supabase Auth user id (uuid). Created lazily
 * on first authenticated request / first order. Stores the delivery details
 * a returning customer shouldn't have to re-type.
 */
export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  fullName: text("full_name"),
  phone: text("phone"),
  address: text("address"),
  governorate: text("governorate"),
  area: text("area"),
  // Admin-controlled account suspension. A banned customer is rejected by
  // requireCustomer immediately (independent of Supabase token expiry), so
  // the block takes effect on their very next request.
  banned: boolean("banned").notNull().default(false),
  bannedReason: text("banned_reason"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
