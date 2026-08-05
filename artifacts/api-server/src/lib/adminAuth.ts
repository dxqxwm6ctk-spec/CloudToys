import type { CookieOptions, Request } from "express";
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
import type { AdminRole } from "@workspace/db";

export const ADMIN_COOKIE_NAME = "admin_session";

// Matches the cookie's maxAge — kept in sync so both auth methods expire
// at the same time.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// ── Password hashing (scrypt, no extra dependency) ──────────────────────────

/** Hash a plaintext password into a storable `salt:hash` string. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify a plaintext password against a hash produced by hashPassword. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidateBuf = scryptSync(password, salt, 64);
  return hashBuf.length === candidateBuf.length && timingSafeEqual(hashBuf, candidateBuf);
}

export interface AdminIdentity {
  username: string;
  role: AdminRole;
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
export function createAdminToken(identity: AdminIdentity): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const encodedUsername = Buffer.from(identity.username, "utf8").toString("base64url");
  const payload = `${encodedUsername}.${identity.role}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Whether this request is a genuinely authenticated admin request (valid
 * bearer token or signed session cookie) — as opposed to just hitting an
 * `/admin` URL. Used to exempt real admin traffic from anti-abuse controls
 * (like the blanket global rate limiter) meant for anonymous/public
 * traffic, so normal dashboard usage never reads as suspicious activity.
 */
export function isVerifiedAdminRequest(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return verifyAdminToken(authHeader.slice("Bearer ".length)) !== null;
  }
  const value = (req as Request & { signedCookies?: Record<string, unknown> }).signedCookies?.[
    ADMIN_COOKIE_NAME
  ];
  return typeof value === "string" && value.length > 0;
}

/**
 * Verify a bearer token created by createAdminToken. Returns the admin
 * identity (username + role) if the signature is valid and the token has
 * not expired, otherwise null.
 */
export function verifyAdminToken(token: string): AdminIdentity | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [encodedUsername, role, expiresAtRaw, signature] = parts;
  const payload = `${encodedUsername}.${role}.${expiresAtRaw}`;

  const expectedSignature = sign(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  try {
    const username = Buffer.from(encodedUsername, "base64url").toString("utf8");
    return { username, role: role as AdminRole };
  } catch {
    return null;
  }
}

/** Encode a username + role pair into the value stored in the signed cookie. */
export function encodeCookieIdentity(identity: AdminIdentity): string {
  return `${identity.username}::${identity.role}`;
}

/** Decode a cookie value produced by encodeCookieIdentity. */
export function decodeCookieIdentity(value: string): AdminIdentity | null {
  const idx = value.lastIndexOf("::");
  if (idx === -1) return null;
  const username = value.slice(0, idx);
  const role = value.slice(idx + 2);
  if (!username || !role) return null;
  return { username, role: role as AdminRole };
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
