import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.SUPABASE_DB_URL) {
  throw new Error(
    "SUPABASE_DB_URL must be set. Add your Supabase Postgres connection string.",
  );
}

export const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
