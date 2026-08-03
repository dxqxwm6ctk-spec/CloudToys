import type { Request, Response, NextFunction } from "express";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "../lib/adminAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUsername?: string;
    }
  }
}

/**
 * Guards every /admin/* route. Accepts either:
 *  - an `Authorization: Bearer <token>` header (preferred — works regardless
 *    of whether the admin frontend and API share an origin), or
 *  - a valid signed `admin_session` cookie (same-origin deployments only —
 *    browsers block this as a third-party cookie across different domains).
 * Returns 401 JSON (never redirects — this is an API, the admin frontend is
 * responsible for showing its login screen).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const username = verifyAdminToken(authHeader.slice("Bearer ".length));
    if (username) {
      req.adminUsername = username;
      next();
      return;
    }
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const value = req.signedCookies?.[ADMIN_COOKIE_NAME];

  if (typeof value !== "string" || value.length === 0) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.adminUsername = value;
  next();
}
