---
name: Live foreign-key verification
description: How to reason about delete failures when an external PostgreSQL schema may differ from the ORM definitions
---

When a delete fails unexpectedly against an external PostgreSQL database, verify the live foreign-key relationships and `ON DELETE` rules from `information_schema` before changing the data model or adding broad cascading deletes.

**Why:** The database schema is maintained separately from the application schema in this project, so deployed constraints can differ from the current Drizzle declarations.

**How to apply:** For product/category deletes, inspect the referencing tables first, delete dependent rows in one transaction where appropriate, and preserve the original data if the parent delete fails.