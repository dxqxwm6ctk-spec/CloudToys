import { pgTable, text, serial, jsonb, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface OrderTrackingStep {
  label: string;
  completed: boolean;
  date: string | null;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull(),
  estimatedDelivery: text("estimated_delivery").notNull(),
  steps: jsonb("steps").$type<OrderTrackingStep[]>().notNull().default([]),
  // Customer info (nullable for legacy seed orders)
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  paymentMethod: text("payment_method"),
  // Line items + total as placed at checkout (nullable — orders created
  // before this field existed have no recorded item detail).
  items: jsonb("items").$type<OrderLineItem[]>(),
  total: numeric("total", { precision: 10, scale: 2 }),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
