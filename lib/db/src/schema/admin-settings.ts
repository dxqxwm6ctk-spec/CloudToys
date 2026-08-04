import { pgTable, text } from "drizzle-orm/pg-core";

/** Generic key/value store for admin-side configuration (e.g. currency_mode). */
export const adminSettingsTable = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type AdminSetting = typeof adminSettingsTable.$inferSelect;
