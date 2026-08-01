# Cloud Toys Admin (standalone)

Fully independent copy of the Cloud Toys admin dashboard. It has no
dependency on any other folder — copy this folder anywhere and it will
install and build on its own.

## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm install
npm run build
```

Output is written to `dist/public`.

## Deploy to Netlify

1. Drag-and-drop this folder into Netlify, or connect a repository that
   contains only this folder.
2. Base directory: leave blank (this folder is the site root).
3. Build settings are pre-configured in `netlify.toml`
   (`npm run build`, publish `dist/public`, SPA redirects).
4. In Site configuration → Environment variables, set:
   - `VITE_API_BASE_URL` — the URL of your deployed API server
     (e.g. `https://api.cloudtoys.com`). All `/api/...` calls made by the
     app will be prefixed with this URL.

If you don't set `VITE_API_BASE_URL`, the app will call `/api/...` on its
own origin, which only works if your API server is reachable at the same
domain.
