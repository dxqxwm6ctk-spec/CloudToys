import path from "path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Comma-separated list of allowed origins for the storefront + admin apps,
// e.g. "https://cloudtoys.com,https://admin.cloudtoys.com". Required in any
// deployment where the frontends live on a different origin than the API
// (Netlify, custom domains, etc). Left unset, all origins are allowed, which
// is fine for local dev / Replit's same-origin path-based preview proxy.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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

app.use(
  "/api/images",
  express.static(path.resolve(import.meta.dirname, "..", "public", "images")),
);
app.use("/api", router);

export default app;
