import type { CookieOptions } from "express";

export const ADMIN_COOKIE_NAME = "admin_session";

// Admin and storefront are deployed on different origins in production
// (e.g. admin.cloudtoys.com calling api.cloudtoys.com), so the cookie must be
// SameSite=None + Secure to survive cross-site requests. Secure requires
// HTTPS, which Replit and every real deployment target provide.
export const ADMIN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  signed: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export const ADMIN_COOKIE_CLEAR_OPTIONS: CookieOptions = {
  httpOnly: true,
  signed: true,
  secure: true,
  sameSite: "none",
  path: "/",
};
