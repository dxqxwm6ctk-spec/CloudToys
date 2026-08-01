import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  // Prefer a fully-formed URL if provided
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  // Fall back to assembling from components (useful when the secrets form
  // truncates long URLs — only the password needs to be a secret)
  const password = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const port = process.env.SUPABASE_DB_PORT ?? "6543";
  const dbName = process.env.SUPABASE_DB_NAME ?? "postgres";
  if (password && host && user) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }
  throw new Error(
    "Database not configured. Set SUPABASE_DB_URL, or set SUPABASE_DB_USER + SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD.",
  );
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
