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
import { logger } from "../lib/logger";

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
router.post("/admin/auth/login", (req, res): void => {
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
