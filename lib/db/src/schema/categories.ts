import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Arabic translation — nullable; storefront falls back to `name` above
  // when not filled in by the admin.
  nameAr: text("name_ar"),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url").notNull(),
}).enableRLS();

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
