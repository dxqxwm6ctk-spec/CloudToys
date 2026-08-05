import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import * as z from "zod";
import { db, adminStaffTable } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  ADMIN_COOKIE_CLEAR_OPTIONS,
  createAdminToken,
  encodeCookieIdentity,
  hashPassword,
  verifyPassword,
} from "../lib/adminAuth";
import { verifySupabaseToken } from "../lib/supabaseAuth";
import { adminLoginRateLimit } from "../lib/security";
import { logger } from "../lib/logger";

/**
 * Auto-creates the first "admin" staff account from the legacy
 * ADMIN_USERNAME/ADMIN_PASSWORD env vars the first time anyone logs in,
 * so existing deployments keep working after moving to DB-backed staff
 * accounts. No-ops once at least one staff row exists.
 */
async function seedFirstAdminIfNeeded(): Promise<void> {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminStaffTable);
  if (count > 0) return;

  await db
    .insert(adminStaffTable)
    .values({
      username: expectedUsername,
      passwordHash: hashPassword(expectedPassword),
      role: "admin",
      active: true,
    })
    .onConflictDoNothing();
}

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

// POST /admin/auth/login — public
router.post("/admin/auth/login", adminLoginRateLimit, async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  await seedFirstAdminIfNeeded();

  const { username, password } = parsed.data;

  const [staff] = await db
    .select()
    .from(adminStaffTable)
    .where(sql`lower(${adminStaffTable.username}) = lower(${username})`);

  if (!staff || !staff.active || !verifyPassword(password, staff.passwordHash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const identity = { username: staff.username, role: staff.role };
  res.cookie(ADMIN_COOKIE_NAME, encodeCookieIdentity(identity), ADMIN_COOKIE_OPTIONS);
  const token = createAdminToken(identity);
  await db
    .update(adminStaffTable)
    .set({ lastLoginAt: new Date() })
    .where(sql`${adminStaffTable.id} = ${staff.id}`);
  res.json({ username: staff.username, role: staff.role, token });
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

  const email = user.email;
  // Preferred match: a staff account whose dedicated `email` field (set in
  // staff management, independent of their display username) matches the
  // Google account. Falls back to matching `username` directly for legacy
  // rows created before the `email` column existed (e.g. the very first
  // admin, or accounts auto-provisioned by the old allowlist-only flow).
  const [existingStaff] = await db
    .select()
    .from(adminStaffTable)
    .where(
      sql`lower(${adminStaffTable.email}) = lower(${email}) OR lower(${adminStaffTable.username}) = lower(${email})`,
    );

  if (existingStaff && !existingStaff.active) {
    res.status(403).json({ error: "This admin account has been disabled" });
    return;
  }

  let username = existingStaff?.username;
  let role = existingStaff?.role;
  if (!role) {
    if (!allowedEmails.has(email.toLowerCase())) {
      logger.warn({ email }, "Admin Google login rejected — email not allowlisted");
      res.status(403).json({ error: "This Google account is not authorized for admin access" });
      return;
    }
    // Legacy allowlist entry with no staff row yet — provision one as
    // "admin" so it shows up in staff management going forward.
    username = email;
    role = "admin";
    await db
      .insert(adminStaffTable)
      .values({
        username: email,
        email,
        passwordHash: hashPassword(randomUUID()),
        role,
        active: true,
      })
      .onConflictDoNothing();
  }

  const identity = { username: username!, role };
  res.cookie(ADMIN_COOKIE_NAME, encodeCookieIdentity(identity), ADMIN_COOKIE_OPTIONS);
  const token = createAdminToken(identity);
  await db
    .update(adminStaffTable)
    .set({ lastLoginAt: new Date() })
    .where(sql`lower(${adminStaffTable.username}) = lower(${username})`);
  res.json({ username, role, token });
});

// POST /admin/auth/logout — public (clearing an absent/invalid cookie is a no-op)
router.post("/admin/auth/logout", (_req, res): void => {
  res.clearCookie(ADMIN_COOKIE_NAME, ADMIN_COOKIE_CLEAR_OPTIONS);
  res.status(204).end();
});

// GET /admin/auth/me — guarded; the admin frontend polls this on load to
// decide whether to show the login screen or the dashboard.
router.get("/admin/auth/me", requireAdmin, (req, res): void => {
  res.json({ username: req.adminUsername, role: req.adminRole });
});

export default router;
