# Deploying the API Server to Render or Railway

The API server lives in a pnpm workspace (it imports `@workspace/db` and
`@workspace/api-zod` from `lib/`), so it is deployed **from the repository
root**, not by copying this folder out on its own — the build command below
builds only this service, but needs its workspace siblings present.

## 1. Render (Web Service)

1. New → Web Service → connect this GitHub repo.
2. Root Directory: leave blank (repo root).
3. Runtime: Node.
4. Build Command:
   ```
   corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
   ```
5. Start Command:
   ```
   node artifacts/api-server/dist/index.mjs
   ```
6. Add the environment variables listed in `.env.example` (below) in the
   Environment tab. Do **not** set `PORT` — Render injects it automatically
   and the app already reads `process.env.PORT`.

## 2. Railway

1. New Project → Deploy from GitHub repo.
2. In the service Settings:
   - Root Directory: leave blank (repo root).
   - Build Command:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
     ```
   - Start Command:
     ```
     node artifacts/api-server/dist/index.mjs
     ```
3. Add the environment variables listed in `.env.example` in the Variables
   tab. Railway also injects `PORT` automatically.

## 3. Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres connection string — use the **pooler** connection string (`aws-0-<region>.pooler.supabase.com:6543`), not the direct-connection host (`db.<ref>.supabase.co`), which is IPv6-only and unreachable from Render/Railway/most hosts. |
| `SESSION_SECRET` | Yes | Signs the admin session cookie. Long random string. |
| `ADMIN_USERNAME` | Yes | Admin login username. |
| `ADMIN_PASSWORD` | Yes | Admin login password. |
| `ALLOWED_ORIGINS` | Yes in production | Comma-separated exact origins of the deployed storefront + admin sites, e.g. `https://cloud-toys.netlify.app,https://cloud-toys-admin.netlify.app`. Without it, CORS allows every origin. |
| `PORT` | Auto-set | Do not set manually — the platform injects it. |
| `LOG_LEVEL` | No | Defaults to info-level logging. |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` | Only for image uploads | See "Object storage" below — not usable as-is outside Replit. |

## 4. Database schema

If you provision a **new** Postgres instance (rather than reusing the
existing one), push the schema to it once before the first request:

```bash
DATABASE_URL="<new-connection-string>" pnpm --filter @workspace/db run push
```

## 5. Object storage (product image uploads) — currently disabled outside Replit

> Decision: for now this is left as-is (working on Replit only). Image
> uploads via `/api/admin/images/upload` and `/api/images/p/...` will fail
> on Render/Railway until this is revisited — see below when ready.


`src/lib/objectStorage.ts` currently authenticates to Google Cloud Storage
through Replit's built-in Object Storage sidecar
(`http://127.0.0.1:1106`), which only exists inside a Replit workspace.
Deployed to Render/Railway as-is, any request that uploads or serves a
product image (`POST /api/admin/images/upload`, `GET /api/images/p/...`)
will fail because that sidecar is unreachable.

To make image uploads work outside Replit, this code needs to be updated to
authenticate with either:
- a standard Google Cloud service account (JSON key as an env var/secret), or
- a different storage provider (S3-compatible, Cloudinary, etc).

This is a real code change, not just a config value — flag it if you want
it done before going live with image uploads on Render/Railway.

## 6. Connecting the deployed frontends

Once this service is live at e.g. `https://cloud-toys-api.onrender.com`:

1. Set `VITE_API_BASE_URL=https://cloud-toys-api.onrender.com` as an
   environment variable on both Netlify sites (`standalone/cloud-toys` and
   `standalone/admin-dashboard`), then trigger a redeploy — Vite bakes env
   vars in at build time, so changing them requires a rebuild.
2. Set `ALLOWED_ORIGINS` on this service to the two Netlify site URLs
   (exact origins, no trailing slash).
3. Verify: `curl https://cloud-toys-api.onrender.com/api/healthz` should
   return `{"status":"ok"}`, and the deployed storefront/admin sites should
   load data without CORS errors in the browser console.
