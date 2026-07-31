import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface OrderTrackingStep {
  label: string;
  completed: boolean;
  date: string | null;
}

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull(),
  estimatedDelivery: text("estimated_delivery").notNull(),
  steps: jsonb("steps").$type<OrderTrackingStep[]>().notNull().default([]),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
