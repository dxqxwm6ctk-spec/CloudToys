import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  // Prefer component-based config when SUPABASE_DB_PASSWORD is set — this
  // avoids issues with long URLs being truncated in the secrets form.
  const password = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const port = process.env.SUPABASE_DB_PORT ?? "6543";
  const dbName = process.env.SUPABASE_DB_NAME ?? "postgres";
  if (password && host && user) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }
  // Fall back to a fully-formed URL
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  // Heroku, Render, and Railway provide the database connection as
  // DATABASE_URL. Keep this fallback aligned with the deployment guide so
  // the API can connect to the same Supabase Postgres pooler outside Replit.
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error(
    "Database not configured. Set SUPABASE_DB_USER + SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD, SUPABASE_DB_URL, or DATABASE_URL.",
  );
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
