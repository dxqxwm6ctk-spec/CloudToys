import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const port = process.env.SUPABASE_DB_PORT ?? "6543";
  const dbName = process.env.SUPABASE_DB_NAME ?? "postgres";
  if (password && host && user) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  throw new Error("Set SUPABASE_DB_USER + SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD, or SUPABASE_DB_URL.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
  },
});
