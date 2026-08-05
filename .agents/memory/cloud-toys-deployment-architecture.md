---
    name: Cloud Toys deployment architecture
    description: Where the Cloud Toys admin/storefront actually run in production - not all on Replit.
    ---

    The admin dashboard's *production* deployment is on Netlify (e.g. admintoy.netlify.app), and it talks to a
    separate API server hosted on **Heroku** (via `VITE_API_BASE_URL` in artifacts/admin-dashboard/src/lib/api-url.ts),
    not this Repl's `api-server` deployment.

    **Why it matters:** fixing a bug in this Repl's `artifacts/api-server` and publishing via Replit's deploy
    does NOT fix the Netlify-hosted admin — that admin build points at the Heroku API, which has its own
    separate codebase/deploy pipeline outside Replit's control.

    **How to apply:** when the user reports a bug reproduced on admintoy.netlify.app (or any *.netlify.app for
    this project), fix the bug here for correctness, but explicitly tell the user they still need to redeploy/sync
    the Heroku API server themselves — Replit's Publish button only affects Replit-hosted artifacts.
    