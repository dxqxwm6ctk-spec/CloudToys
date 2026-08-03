---
name: Drizzle schema push drift (external DB deployments)
description: Why a deployed API can 500 with "column does not exist" even though local schema.ts and the DB structure look fine at a glance
---

# Drizzle schema push drift

## Rule
When the DB is an external, unmanaged Postgres (e.g. Supabase, not Replit's built-in DB), schema changes only reach the DB when someone manually runs `drizzle-kit push` (here: `pnpm --filter @workspace/db run push`). There is no automatic migration step tied to deploys.

**Why:** A column can be added to `schema.ts` and used in route code, ship fine in dev, and still be entirely missing from production — because nobody re-ran `push` after adding it. The app then throws `column "..." does not exist` for any query touching that column, while unrelated queries (e.g. a different table/route) keep working fine. This is easy to misdiagnose as a CORS/env/auth issue because the symptom (empty page, generic 500) gives no hint about the DB.

**How to apply:** When a production endpoint 500s but the equivalent local/dev logic looks correct, check for schema drift first — run `\d <table>` against the production DB directly (e.g. via `psql` with the DB's saved connection secrets) and diff it against `schema.ts` before assuming it's a code bug. Fix by running the project's DB push command against production, or (if push access isn't available) issue the equivalent `ALTER TABLE` by hand and keep it consistent with `schema.ts`.
