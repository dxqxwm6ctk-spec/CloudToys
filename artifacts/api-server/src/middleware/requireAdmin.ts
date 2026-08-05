import type { Request, Response, NextFunction } from "express";
import type { AdminRole } from "@workspace/db";
import { ADMIN_COOKIE_NAME, verifyAdminToken, decodeCookieIdentity } from "../lib/adminAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUsername?: string;
      adminRole?: AdminRole;
    }
  }
}

/**
 * Guards every /admin/* route. Accepts either:
 *  - an `Authorization: Bearer <token>` header (preferred — works regardless
 *    of whether the admin frontend and API share an origin), or
 *  - a valid signed `admin_session` cookie (same-origin deployments only —
 *    browsers block this as a third-party cookie across different domains).
 * Sets `req.adminUsername`/`req.adminRole` for downstream role checks.
 * Returns 401 JSON (never redirects — this is an API, the admin frontend is
 * responsible for showing its login screen).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const identity = verifyAdminToken(authHeader.slice("Bearer ".length));
    if (identity) {
      req.adminUsername = identity.username;
      req.adminRole = identity.role;
      next();
      return;
    }
    // Bearer token present but invalid/expired (e.g. stale localStorage
    // token from before a SESSION_SECRET rotation, or past its 7-day TTL).
    // Fall through to the cookie instead of failing outright — a same-origin
    // deployment (or a browser that still accepts the cookie) may still have
    // a valid session even though the stored bearer token doesn't.
  }

  const value = req.signedCookies?.[ADMIN_COOKIE_NAME];

  if (typeof value !== "string" || value.length === 0) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const identity = decodeCookieIdentity(value);
  if (!identity) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.adminUsername = identity.username;
  req.adminRole = identity.role;
  next();
}

/**
 * Restricts a route (or an entire router mounted after `requireAdmin`) to
 * specific roles. Must run after `requireAdmin` so `req.adminRole` is set.
 */
export function requireRole(...allowed: AdminRole[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.adminRole || !allowed.includes(req.adminRole)) {
      res.status(403).json({ error: "You don't have permission to do this" });
      return;
    }
    next();
  };
}
