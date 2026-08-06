# Cloud Toys

Premium eCommerce website for a toy store — 11 pages with full cart, wishlist, product catalog, checkout, order tracking, and account flows. Apple/Tesla-inspired premium design with Burgundy (#7A1F3D) + Soft Gold (#C9A227) brand palette.

## Deployment model

This project now runs directly inside Replit via the configured workflows (`artifacts/cloud-toys: web`, `artifacts/admin-dashboard: web`, `artifacts/api-server: API Server`, `artifacts/mockup-sandbox: Component Preview Server`) — `pnpm install` has been run and all four workflows start cleanly in this repl. The original `Procfile`/`netlify.toml` files describing a Heroku+Netlify deployment are legacy from before the project was imported into Replit; they're harmless to leave in place but are not how this repl runs today.

- **Database + file storage** → **Supabase** (not Replit's built-in Postgres/Object Storage), reached via `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_NAME`, `SUPABASE_DB_PASSWORD` secrets already saved in this repl — they persist across sessions, so never ask the user to re-enter them; just use them (e.g. via `psql`/`PGPASSWORD` in the shell) if a task needs direct DB access.
- **Image storage** → Supabase Storage, via the `SUPABASE_SERVICE_ROLE_KEY` secret (server-side only, used by `artifacts/api-server/src/lib/supabaseStorage.ts`).
- Any change to `lib/db/src/schema/*` must be followed by `pnpm --filter @workspace/db run push` against this same Supabase DB — the live DB does **not** auto-sync with the Drizzle schema in code. If the API server throws "column ... does not exist", schema drift (an un-pushed migration) is the first thing to check.
- Client-side Google sign-in needs `SUPABASE_URL` / `SUPABASE_ANON_KEY` (public anon key, safe to expose) — read by both frontends via Vite's `envPrefix`. Without them, `supabaseClient.ts` in each frontend falls back to a placeholder URL so the app still loads instead of crashing, but Google sign-in will not work until real values are set.

**Redeploying:** if the user later moves this to Heroku/Netlify instead of Replit Deployments, code changes won't go live until they push/deploy there themselves.

## Run & Operate

- **Frontend (Cloud Toys):** managed by `artifacts/cloud-toys: web` workflow — `pnpm --filter @workspace/cloud-toys run dev`
- **Admin Dashboard:** managed by `artifacts/admin-dashboard: web` workflow — `pnpm --filter @workspace/admin-dashboard run dev`
- **API Server:** managed by `artifacts/api-server: API Server` workflow — `pnpm --filter @workspace/api-server run dev`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed demo categories, products, reviews, and a sample order (idempotent — safe to re-run)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- Required env for image uploads: `SUPABASE_SERVICE_ROLE_KEY` — Supabase Storage service_role secret key (Project Settings → API); images are stored in Supabase Storage, not Replit Object Storage
- Required secrets for admin login: `ADMIN_USERNAME`, `ADMIN_PASSWORD` — used only to auto-seed the very first `admin_staff` row on first login when the table is empty (`seedFirstAdminIfNeeded` in `adminAuth.ts`); admin accounts are otherwise managed via the multi-account staff table (see "Admin staff accounts" below)
- Required env for CORS in any multi-domain deployment: `ALLOWED_ORIGINS` — comma-separated list, e.g. `https://cloudtoys.com,https://admin.cloudtoys.com`. Unset = allow all origins (fine for local dev / Replit's same-origin preview proxy, unsafe for production on separate domains)
- Required env for Google sign-in (customer storefront + admin): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — read by both frontends (Vite `envPrefix` includes `SUPABASE_`, so no `VITE_` prefix needed) and by the API server. The Google provider itself must be enabled in the Supabase dashboard (Authentication → Providers → Google) with a Google Cloud OAuth Client ID/Secret — that's owned by the user, not configurable from here.
- Required env for admin Google sign-in specifically: `ADMIN_ALLOWED_EMAILS` — comma-separated allowlist of Google emails allowed to *auto-create* a brand-new admin account on first Google sign-in. Not needed for staff whose account already has a Google Email set (see "Admin staff accounts" below) — see "Customer & Admin auth" below.

## Independent deployment (storefront + admin as separate apps)

The storefront and admin dashboard are two fully independent frontends that both call the same API server — no shared code, no cross-links, no routes into each other.

- **Storefront** → deploy to its own domain (e.g. `cloudtoys.com`). Netlify config: `artifacts/cloud-toys/netlify.toml`.
- **Admin** → deploy to a separate subdomain (e.g. `admin.cloudtoys.com`). Netlify config: `artifacts/admin-dashboard/netlify.toml`. Protected by session-cookie login (see Admin auth below) — never expose it under a path on the storefront domain.
- **API server** → deploy once (e.g. Replit Deployments), serves both. Set `ALLOWED_ORIGINS` to the storefront + admin production URLs so CORS only allows those two origins. Both frontends read `VITE_API_BASE_URL` (set at build time) to know where the API lives.

## Admin auth

- Session is a signed, `httpOnly`, `Secure`, `SameSite=None` cookie (`admin_session`), signed with `SESSION_SECRET` via `cookie-parser` — works across the admin-subdomain ↔ API cross-origin boundary.
- Routes: `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me` (`artifacts/api-server/src/routes/adminAuth.ts`).
- `requireAdmin` middleware (`artifacts/api-server/src/middleware/requireAdmin.ts`) guards every other `/api/admin/*` route, mounted in `routes/index.ts` after the auth routes so login/logout stay public.
- Frontend: `AuthProvider`/`useAuth` (`artifacts/admin-dashboard/src/context/AuthContext.tsx`) gates the whole app in `App.tsx` — shows `pages/login.tsx` until `/api/admin/auth/me` succeeds.
- Model is a single shared admin credential (env vars), not a per-user accounts table — adequate for one store owner, not for multiple admin users with distinct permissions.

## Stack

- pnpm workspaces, Node.js, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Framer Motion, Wouter, shadcn/ui (Radix UI), TanStack Query
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- **Frontend pages:** `artifacts/cloud-toys/src/pages/` — Home, Shop, ProductDetail, Categories, About, Contact, Cart, Checkout, Wishlist, Account, TrackOrder
- **Admin pages:** `artifacts/admin-dashboard/src/pages/` — dashboard, products, categories, orders, settings/payment-methods, login
- **API routes:** `artifacts/api-server/src/routes/` — catalog.ts, orders.ts, health.ts, admin.ts, adminAuth.ts, images.ts
- **OpenAPI spec:** `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- **DB schema:** `lib/db/src/schema/` — products.ts, categories.ts, reviews.ts, orders.ts
- **Theme/tokens:** `artifacts/cloud-toys/src/index.css` — CSS custom properties, brand palette
- **Generated API hooks:** `lib/api-client-react/src/generated/api.ts` (do not edit manually)
- **Generated Zod schemas:** `lib/api-zod/src/generated/api.ts` (do not edit manually)

## Architecture decisions

- OpenAPI-first: spec gates codegen, codegen gates frontend — never hand-write types that Orval generates
- Frontend imports generated hooks from `@workspace/api-client-react` (barrel export), not subpaths
- All API routes are mounted under `/api` prefix; the frontend uses `@workspace/api-client-react`'s `custom-fetch.ts` for base URL resolution
- Cart and Wishlist state are managed client-side via React Context (CartContext, WishlistContext) — no backend persistence for these yet
- Drizzle schema changes must be followed by `pnpm --filter @workspace/db run push` in dev; Replit's Publish flow handles production schema migrations automatically

## Product

Cloud Toys is a premium toy store with: full product catalog with search/filter/sort, category browsing, product detail pages with gallery + reviews, add-to-cart and wishlist, checkout flow, order tracking by order number, user account page.

## Payment Methods
- Seeded in `lib/db/src/schema/payment-methods.ts` (table: `payment_methods`)
- Admin manages them at `/admin-dashboard/settings/payment-methods` — toggle enabled/disabled
- Checkout (`artifacts/cloud-toys/src/pages/Checkout.tsx`) fetches enabled methods from `GET /api/orders/payment-methods` and only shows those
- Admin API: `GET /api/admin/settings/payment-methods`, `PUT /api/admin/settings/payment-methods/:id`

## Order Tracking
- Orders are now persisted via `POST /api/orders` (called from Checkout) — stores customerName, customerPhone (Jordanian mobile, validated both client- and server-side), paymentMethod, steps
- Admin updates status at `PUT /api/admin/orders/:id/status` — automatically advances the 5 tracking steps (Order Placed → Payment Confirmed → Shipped → Out for Delivery → Delivered)
- Customer tracks order at `/track-order?number=ORD-...` — reads live from DB
- Order statuses: `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`

## Customer & Admin auth (Google sign-in via Supabase)

- **Customer (storefront):** `artifacts/cloud-toys/src/context/CustomerAuthContext.tsx` wraps the app and exposes `useCustomerAuth()` (`user`, `signInWithGoogle`, `signOut`). Uses `supabase-js` directly in the browser — Supabase handles the OAuth redirect and session storage itself, no backend call needed to establish a customer session. `Account.tsx` shows a "Sign in with Google" screen when signed out.
- **Verifying a customer session server-side:** `artifacts/api-server/src/lib/supabaseAuth.ts` — `requireCustomer` / `attachCustomerIfPresent` middleware verify the Supabase access token (sent as `Authorization: Bearer <token>`) and attach `req.customer`. Currently used by `routes/orders.ts`.
- **Admin dashboard:** still gated by its own session (`admin_session` cookie + bearer token, `lib/adminAuth.ts`) — Google sign-in is an additional way to *obtain* that session, not a replacement for it. Flow: admin clicks "Sign in with Google" → Supabase OAuth redirect → `AuthContext` picks up the resulting Supabase session → exchanges it via `POST /api/admin/auth/google` → the API verifies the Supabase token and looks up the matching `admin_staff` row.
- Both frontends read `SUPABASE_URL` / `SUPABASE_ANON_KEY` via Vite's `envPrefix: ['VITE_', 'SUPABASE_']` (see each app's `vite.config.ts`) — no `VITE_` prefix needed on those two.

## Admin staff accounts (multi-admin, roles, Google sign-in)

- `admin_staff` (`lib/db/src/schema/admin-staff.ts`) is a real per-account table — `id`, `username` (unique, any display name), `passwordHash`, `role` (`admin`/`manager`/`supervisor`), `active`, optional `email` (unique, nullable), `createdAt`, `lastLoginAt`. Managed from the dashboard's "Staff & Admins" page (`artifacts/admin-dashboard/src/pages/staff/list.tsx`), admin-only (`artifacts/api-server/src/routes/adminStaff.ts`, restricted in `routes/index.ts`).
- `username` is what the person logs in with via password; `email` is a separate, optional field purely for matching "Sign in with Google" — set it on a staff account to let that person log in with their Google account without needing their password. The two are intentionally decoupled so a staff member's login name doesn't have to be their Gmail address.
- Google login match order (`artifacts/api-server/src/routes/adminAuth.ts`, `POST /admin/auth/google`): 1) an `admin_staff` row whose `email` matches the verified Google email (case-insensitive), 2) falls back to matching `username` directly for legacy rows created before the `email` column existed, 3) if neither matches, the email must be in `ADMIN_ALLOWED_EMAILS` to auto-provision a brand-new `admin` row.

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, re-run codegen before building the frontend
- The `@workspace/api-client-react` package only exports the root barrel (`.`) — import hooks from `@workspace/api-client-react`, never from `@workspace/api-client-react/src/generated/api`
- Google Fonts `@import url(...)` must be the FIRST line in `index.css` (before `@import 'tailwindcss'`) to avoid PostCSS ordering errors

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
