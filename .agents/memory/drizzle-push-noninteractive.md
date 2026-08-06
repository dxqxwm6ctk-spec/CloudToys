---
name: drizzle-kit push in non-interactive shells
description: drizzle-kit push can hang/error on a TTY confirmation prompt for "safe" changes like adding a nullable unique column; workaround when that happens.
---

`drizzle-kit push` sometimes asks an interactive yes/no question (e.g. "add a unique constraint to a table with N rows, truncate?") even when the change is safe (adding a nullable unique column — Postgres allows multiple NULLs). In a non-TTY shell this throws `Interactive prompts require a TTY terminal` instead of proceeding.

**Why:** drizzle-kit's push CLI doesn't reliably detect "safe" schema diffs and always prompts for anything it classifies as a unique/constraint change, regardless of piped stdin.

**How to apply:** If a piped `printf "n\n" | pnpm run push` still errors on the TTY check, apply the equivalent DDL directly via a short Node script using the `pg` client and the same `SUPABASE_DB_*` env vars as `drizzle.config.ts` (see `lib/db/drizzle.config.ts` for the connection string pattern). Prefer `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...)` over `CREATE UNIQUE INDEX` — drizzle's introspection expects a real constraint and will still flag a manually-created index as a pending change on the next `push`. After applying manually, re-run `push` to confirm no diff remains.
