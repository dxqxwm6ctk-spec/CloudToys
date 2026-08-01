import type { Request, Response, NextFunction } from "express";
import { ADMIN_COOKIE_NAME } from "../lib/adminAuth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUsername?: string;
    }
  }
}

/**
 * Guards every /admin/* route. Requires a valid signed `admin_session` cookie
 * set by POST /admin/auth/login. Returns 401 JSON (never redirects — this is
 * an API, the admin frontend is responsible for showing its login screen).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const value = req.signedCookies?.[ADMIN_COOKIE_NAME];

  if (typeof value !== "string" || value.length === 0) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.adminUsername = value;
  next();
}
