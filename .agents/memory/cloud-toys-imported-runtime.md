---
name: Cloud Toys imported runtime
description: Runtime behavior when the imported Cloud Toys project has database access but no Supabase Storage credentials
---

The Cloud Toys catalog and API can run from the imported Replit workspace even when Supabase Storage is not configured. Uploaded product-image URLs depend on `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; without them, image requests must be treated as unavailable rather than as a fatal app-startup failure.

**Why:** The database-backed storefront remained usable while missing storage configuration caused repeated image-request 500s and obscured the real state of the app.

**How to apply:** When restoring this imported project, verify API/database startup separately from image storage. Keep browsing and authentication available without storage credentials, and only enable upload/image serving after the server-side Supabase Storage configuration is present.