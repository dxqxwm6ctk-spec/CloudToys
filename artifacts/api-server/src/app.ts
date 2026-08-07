import path from "path";
import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { blockBannedIps, globalApiRateLimit } from "./lib/security";

const app: Express = express();

// Heroku (and most PaaS hosts) sit behind a single reverse proxy — trust it
// so `req.ip` reflects the real client IP (X-Forwarded-For) instead of the
// proxy's own address. Required for rate limiting and IP blocking to work.
app.set("trust proxy", 1);

// Comma-separated list of allowed origins for the storefront + admin apps,
// e.g. "https://cloudtoys.com,https://admin.cloudtoys.com". Required in any
// deployment where the frontends live on a different origin than the API
// (Netlify, custom domains, etc). Left unset, all origins are allowed, which
// is fine for local dev / Replit's same-origin path-based preview proxy.
// Keep the currently deployed admin origin available even if an older
// Heroku config still has an incomplete ALLOWED_ORIGINS value. Additional
// storefront/custom origins can still be supplied through the environment.
const defaultAllowedOrigins = ["https://admintoy.netlify.app"];
const configuredAllowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([
  ...defaultAllowedOrigins,
  ...configuredAllowedOrigins,
])];

if (allowedOrigins.length === 0) {
  logger.warn(
    "ALLOWED_ORIGINS is not set — CORS will allow all origins. Set it in production (e.g. https://cloudtoys.com,https://admin.cloudtoys.com).",
  );
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin browser nav, curl, server-to-server —
      // always allow. Browsers always send Origin on cross-origin fetches.
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin "${origin}" is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(blockBannedIps);
app.use("/api", globalApiRateLimit);

app.use(
  "/api/images",
  express.static(path.resolve(import.meta.dirname, "..", "public", "images")),
);
app.use("/api", router);

// Without this, a rejected CORS origin bubbles up as an unhandled error and
// Express's default handler returns a plain HTML 500 with no CORS headers —
// browsers surface that to fetch() callers as an opaque "Failed to fetch"
// instead of a diagnosable error. Return a clean JSON 403 instead.
const corsErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof Error && /not allowed by CORS/.test(err.message)) {
    res.status(403).json({ error: err.message });
    return;
  }
  next(err);
};
app.use(corsErrorHandler);

export default app;
