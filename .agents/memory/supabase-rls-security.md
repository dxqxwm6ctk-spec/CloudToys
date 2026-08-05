---
name: Supabase RLS enablement
description: How RLS was enabled on Supabase-linked Drizzle tables without breaking the app's own API server.
---

Supabase's linter flags any `public` schema table without Row Level Security (RLS) as an ERROR, because PostgREST exposes those tables to anyone holding the project's anon key by default.

**Why safe to enable RLS with no policies here:** the app's own backend (api-server) never queries Supabase via PostgREST/anon key — it connects directly over Postgres using `SUPABASE_DB_*` credentials via `drizzle-orm/node-postgres`, as the table owner role, which bypasses RLS automatically. Frontend `supabase-js` clients in this project are only used for Supabase Auth, never `.from(table)` queries. So `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with zero policies blocks the anon/PostgREST path entirely while leaving the app's own data access untouched.

**How to apply:** drizzle-orm >=0.32 supports `.enableRLS()` chained on `pgTable(...)`. Add it to each table definition in `lib/db/src/schema/*.ts`, then run `pnpm run push` inside `lib/db` (drizzle-kit push) to apply it to the live Supabase database — this project's external DB only picks up schema changes via that manual push, not automatically.

Before repeating this pattern on a new project, verify the same assumption holds: check whether the frontend does direct `.from(table)` Supabase queries (not just Auth) before enabling RLS with no policies, or the app itself would start getting empty results.
