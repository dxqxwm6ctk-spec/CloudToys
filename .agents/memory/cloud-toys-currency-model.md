---
name: Cloud Toys currency model
description: How currency is handled across the Cloud Toys storefront/admin — read before touching pricing, shipping threshold, or any currency toggle.
---

Cloud Toys deliberately has **no exchange-rate conversion** anywhere. JOD is the
store's base currency for cart/checkout totals. Each product carries its own
`currency` field (JOD or USD) purely as a **display label** — never converted.

**Why:** explicit user decision — conversions were seen as confusing/untrustworthy
for a single-market (Jordan) store; admins price each product in whichever
currency they choose and the number is shown as-is.

**How to apply:**
- Cart/checkout totals (`cartTotal`, `total`, shipping) are always JOD — use
  `formatJOD()` from `artifacts/cloud-toys/src/lib/currency.ts`.
- Free-shipping threshold is admin-configurable (amount + a display-only
  currency label) via `/api/settings/shipping` (public) and
  `/api/admin/settings/shipping` (admin CRUD); always read it through the
  `useShippingThreshold()` hook in `hooks/useStoreSettings.ts` rather than
  hardcoding a number.
- Do not add any "switch display currency" toggle that recomputes amounts —
  a previous half-built one (`AdminLayout.tsx` USD/JOD buttons wired to a
  nonexistent `mode`/`setMode`) was removed as dead code; don't reintroduce it.
- Return-policy and warranty-policy admin toggles already exist end-to-end
  (`/api/settings/returns`, `/api/settings/warranty` + admin settings pages) —
  check there before assuming a feature request needs new plumbing.
