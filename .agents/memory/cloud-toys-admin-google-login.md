---
name: Cloud Toys admin Google login
description: How "Sign in with Google" resolves to an admin_staff account — the email column vs username, and the allowlist's remaining role.
---

`admin_staff` (`lib/db/src/schema/admin-staff.ts`) has two independent identity fields: `username` (login name for password auth, can be anything — e.g. an Arabic display name) and `email` (nullable, unique — the Google account used to match "Sign in with Google").

**Why:** The user explicitly asked for staff whose username isn't necessarily their Gmail address to still be able to sign in with Google. A single shared field would force `username == email` for any Google-enabled account.

**How to apply:** `POST /admin/auth/google` (`artifacts/api-server/src/routes/adminAuth.ts`) resolves an incoming Google email in this order: 1) `admin_staff.email` match (case-insensitive) — the primary path, set via the Staff & Admins page; 2) `admin_staff.username` match — legacy fallback for rows created before the `email` column existed; 3) `ADMIN_ALLOWED_EMAILS` allowlist — only consulted when neither row exists, to auto-provision a brand-new `admin` account on first-ever Google login. Staff CRUD (`artifacts/api-server/src/routes/adminStaff.ts`) validates `email` uniqueness separately from `username` uniqueness.
