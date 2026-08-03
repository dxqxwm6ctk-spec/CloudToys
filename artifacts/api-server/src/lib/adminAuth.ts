import type { CookieOptions } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "admin_session";

// Matches the cookie's maxAge — kept in sync so both auth methods expire
// at the same time.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Create a stateless bearer token for the admin dashboard.
 *
 * Used alongside the `admin_session` cookie because browsers (Chrome,
 * Safari) increasingly block cross-site cookies by default. When the admin
 * frontend and API are deployed on different domains (e.g. a Netlify
 * frontend + a Heroku API), the cookie is treated as third-party and
 * silently dropped — login appears to succeed but every subsequent request
 * comes back unauthenticated. A bearer token sent via the `Authorization`
 * header has no such restriction, so the admin dashboard prefers it.
 */
export function createAdminToken(username: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${Buffer.from(username, "utf8").toString("base64url")}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verify a bearer token created by createAdminToken. Returns the admin
 * username if the signature is valid and the token has not expired,
 * otherwise null.
 */
export function verifyAdminToken(token: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedUsername, expiresAtRaw, signature] = parts;
  const payload = `${encodedUsername}.${expiresAtRaw}`;

  const expectedSignature = sign(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  try {
    return Buffer.from(encodedUsername, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

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
