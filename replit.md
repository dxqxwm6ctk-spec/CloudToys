# Cloud Toys

Premium eCommerce website for a toy store — 11 pages with full cart, wishlist, product catalog, checkout, order tracking, and account flows. Apple/Tesla-inspired premium design with Burgundy (#7A1F3D) + Soft Gold (#C9A227) brand palette.

## Run & Operate

- **Frontend (Cloud Toys):** managed by `artifacts/cloud-toys: web` workflow — `pnpm --filter @workspace/cloud-toys run dev`
- **API Server:** managed by `artifacts/api-server: API Server` workflow — `pnpm --filter @workspace/api-server run dev`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed demo categories, products, reviews, and a sample order (idempotent — safe to re-run)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

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
- **API routes:** `artifacts/api-server/src/routes/` — catalog.ts, orders.ts, health.ts
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

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, re-run codegen before building the frontend
- The `@workspace/api-client-react` package only exports the root barrel (`.`) — import hooks from `@workspace/api-client-react`, never from `@workspace/api-client-react/src/generated/api`
- Google Fonts `@import url(...)` must be the FIRST line in `index.css` (before `@import 'tailwindcss'`) to avoid PostCSS ordering errors

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
