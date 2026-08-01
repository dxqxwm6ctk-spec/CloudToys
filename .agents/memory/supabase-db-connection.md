---
name: Supabase DB connection pattern
description: How the DB connection is configured in this project — component-based secrets to work around Replit secrets form URL truncation
---

# Supabase DB Connection

## Rule
Use component env vars instead of a single SUPABASE_DB_URL. The URL gets truncated when entered in the Replit secrets form.

## How it works
`lib/db/src/index.ts` and `lib/db/drizzle.config.ts` call `getConnectionString()` which prefers:
1. `SUPABASE_DB_PASSWORD` + `SUPABASE_DB_HOST` + `SUPABASE_DB_USER` (secrets form-safe)
2. Falls back to `SUPABASE_DB_URL` if the above are not set

Non-secret env vars (shared environment):
- `SUPABASE_DB_USER` = `postgres.jrxcxypnytgbrzosaleq`
- `SUPABASE_DB_HOST` = `aws-0-eu-west-1.pooler.supabase.com`
- `SUPABASE_DB_PORT` = `6543`
- `SUPABASE_DB_NAME` = `postgres`

Secret:
- `SUPABASE_DB_PASSWORD` = (set via Replit secrets)

**Why:** Replit secrets form truncates long strings like full Postgres connection URLs, causing authentication failures. Splitting into components lets users enter just the password (short string) as the secret.

**How to apply:** If SUPABASE_DB_URL ever needs to be updated, prefer updating SUPABASE_DB_PASSWORD instead.
