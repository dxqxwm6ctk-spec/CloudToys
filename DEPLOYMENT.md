# Cloud Toys — Deployment Guide

This project deploys as **three separate services**:

| Service | Platform | What it does |
|---------|----------|-------------|
| API Server | Heroku | Express backend + database |
| Cloud Toys (storefront) | Netlify | Customer-facing shop |
| Cloud Toys Admin | Netlify | Admin dashboard |

---

## 1. Deploy the API Server on Heroku

### 1-a. Create the Heroku app
1. Go to [heroku.com](https://heroku.com) → **New → Create new app**.
2. Connect your GitHub repo under **Deploy → GitHub**.
3. Enable **Automatic Deploys** from `main`.

### 1-b. Set Config Vars (Settings → Config Vars)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase **Transaction pooler** URL (see `.env.example`) |
| `SESSION_SECRET` | A long random string |
| `ADMIN_USERNAME` | Your admin username |
| `ADMIN_PASSWORD` | A strong password |
| `ALLOWED_ORIGINS` | Both Netlify URLs, comma-separated (set **after** step 2) |

Example `ALLOWED_ORIGINS`:
```
https://cloud-toys.netlify.app,https://cloud-toys-admin.netlify.app
```

> ⚠️ Use your **actual** Netlify site URLs, not the examples above.

### 1-c. Note your Heroku API URL
After first deploy, your API URL will be something like:
```
https://your-app-name.herokuapp.com
```
You'll need this in the next step.

---

## 2. Deploy the Storefront (Cloud Toys) on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
2. Connect your GitHub repo.
3. Set **Netlify configuration file** path to:
   ```
   artifacts/cloud-toys/netlify.toml
   ```
4. Leave **Base directory** blank (use repo root).
5. Click **Deploy**.

### Environment Variables (Site configuration → Environment variables)

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-app-name.herokuapp.com` |

---

## 3. Deploy the Admin Dashboard on Netlify

1. Create a **second** Netlify site from the same GitHub repo.
2. Set **Netlify configuration file** path to:
   ```
   artifacts/admin-dashboard/netlify.toml
   ```
3. Leave **Base directory** blank (use repo root).
4. Click **Deploy**.

### Environment Variables

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-app-name.herokuapp.com` |

---

## 4. Final step — Update CORS on Heroku

Once both Netlify sites are live, go back to **Heroku → Settings → Config Vars** and update `ALLOWED_ORIGINS` with the real Netlify URLs:

```
https://your-storefront.netlify.app,https://your-admin.netlify.app
```

Then restart the Heroku dyno: **More → Restart all dynos**.

---

## ⚠️ Image Uploads

Product image uploads rely on Replit's built-in Object Storage, which is **not available on Heroku**. Images already in the database will display correctly, but uploading new images from the admin will not work until you wire up an external storage provider (GCS, S3, or Cloudinary). See `artifacts/api-server/src/routes/images.ts` for the upload logic.
