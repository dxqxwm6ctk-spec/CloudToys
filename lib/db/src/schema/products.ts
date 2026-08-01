import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  imageUrl: text("image_url").notNull(),
  galleryUrls: text("gallery_urls").array().notNull().default([]),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  badge: text("badge"),
  features: text("features").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Optimised image variants — populated after upload via /admin/images/upload
  thumbUrl: text("thumb_url"),
  mediumUrl: text("medium_url"),
  largeUrl: text("large_url"),
  originalImageFilename: text("original_image_filename"),
  imageAlt: text("image_alt"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
