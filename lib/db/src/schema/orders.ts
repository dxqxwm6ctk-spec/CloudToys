import { pgTable, text, serial, jsonb, numeric, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
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
  customerPhone: text("customer_phone"),
  paymentMethod: text("payment_method"),
  // Links the order to the authenticated customer account (Supabase Auth
  // user id). Null for orders placed before accounts existed.
  userId: uuid("user_id"),
  // Line items + total as placed at checkout (nullable — orders created
  // before this field existed have no recorded item detail).
  items: jsonb("items").$type<OrderLineItem[]>(),
  shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 10, scale: 2 }),
  shippingAddress: text("shipping_address"),
  // Customer-side soft delete: hides the order from "My Orders" without
  // touching admin visibility or order history/analytics.
  hiddenByCustomer: boolean("hidden_by_customer").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}).enableRLS();

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
