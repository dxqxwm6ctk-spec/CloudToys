import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import * as z from "zod";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  ADMIN_COOKIE_CLEAR_OPTIONS,
  createAdminToken,
} from "../lib/adminAuth";
import { verifySupabaseToken } from "../lib/supabaseAuth";
import { adminLoginRateLimit } from "../lib/security";
import { logger } from "../lib/logger";

/**
 * Emails allowed to sign in to the admin dashboard via "Sign in with
 * Google". This is a simple allowlist (not a full accounts table) — Google
 * only *identifies* the person; whether they're allowed in as an admin is
 * still controlled here, via the ADMIN_ALLOWED_EMAILS env var.
 */
function getAllowedAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

const router: IRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Constant-time comparison — prevents leaking password length/content via
// response-time differences.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// POST /admin/auth/login — public
router.post("/admin/auth/login", adminLoginRateLimit, (req, res): void => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    logger.error(
      "ADMIN_USERNAME/ADMIN_PASSWORD are not configured — admin login is disabled",
    );
    res.status(500).json({ error: "Admin authentication is not configured" });
    return;
  }

  const { username, password } = parsed.data;
  const usernameOk = safeCompare(username, expectedUsername);
  const passwordOk = safeCompare(password, expectedPassword);

  if (!usernameOk || !passwordOk) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.cookie(ADMIN_COOKIE_NAME, username, ADMIN_COOKIE_OPTIONS);
  const token = createAdminToken(username);
  res.json({ username, token });
});

const googleLoginSchema = z.object({
  accessToken: z.string().min(1),
});

// POST /admin/auth/google — public. Body carries the Supabase access token
// obtained client-side after "Sign in with Google" completes. We verify the
// token with Supabase, then check the resulting email against the
// ADMIN_ALLOWED_EMAILS allowlist before issuing the same admin session used
// by password login.
router.post("/admin/auth/google", adminLoginRateLimit, async (req, res): Promise<void> => {
  const parsed = googleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.size === 0) {
    logger.error(
      "ADMIN_ALLOWED_EMAILS is not configured — admin Google login is disabled",
    );
    res.status(500).json({ error: "Admin Google sign-in is not configured" });
    return;
  }

  const user = await verifySupabaseToken(parsed.data.accessToken);
  if (!user || !user.email) {
    res.status(401).json({ error: "Invalid or expired Google session" });
    return;
  }

  if (!allowedEmails.has(user.email.toLowerCase())) {
    logger.warn({ email: user.email }, "Admin Google login rejected — email not allowlisted");
    res.status(403).json({ error: "This Google account is not authorized for admin access" });
    return;
  }

  res.cookie(ADMIN_COOKIE_NAME, user.email, ADMIN_COOKIE_OPTIONS);
  const token = createAdminToken(user.email);
  res.json({ username: user.email, token });
});

// POST /admin/auth/logout — public (clearing an absent/invalid cookie is a no-op)
router.post("/admin/auth/logout", (_req, res): void => {
  res.clearCookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_CLEAR_OPTIONS);
  res.status(204).end();
});

// GET /admin/auth/me — guarded; the admin frontend polls this on load to
// decide whether to show the login screen or the dashboard.
router.get("/admin/auth/me", requireAdmin, (req, res): void => {
  res.json({ username: req.adminUsername });
});

export default router;
