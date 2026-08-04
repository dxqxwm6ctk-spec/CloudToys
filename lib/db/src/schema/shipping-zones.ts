import { pgTable, serial, text, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Each row is a "shipping zone": a named group of governorates (محافظات)
 * with a single delivery price. One zone can be flagged as the default
 * fallback for governorates not covered by any explicit zone.
 */
export const shippingZonesTable = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Comma-separated governorate values, e.g. "amman,zarqa" */
  governorates: text("governorates").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertShippingZoneSchema = createInsertSchema(shippingZonesTable).omit({ id: true });
export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;
export type ShippingZone = typeof shippingZonesTable.$inferSelect;
