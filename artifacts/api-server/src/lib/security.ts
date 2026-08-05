import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { db, securityEventsTable, blockedIpsTable } from "@workspace/db";
import { logger } from "./logger";

/** Best-effort real client IP, correct behind Heroku's single reverse proxy (see app.ts `trust proxy`). */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/**
 * Record a suspicious/abusive request for the admin Security dashboard.
 * Never throws — a logging failure must not take down the request it's
 * attached to.
 */
export async function logSecurityEvent(
  req: Request,
  reason: string,
): Promise<void> {
  try {
    await db.insert(securityEventsTable).values({
      ip: clientIp(req),
      method: req.method,
      path: req.originalUrl?.split("?")[0] ?? req.path,
      reason,
      userId: req.customer?.id ?? null,
      email: req.customer?.email ?? null,
    });
  } catch (err) {
    logger.error({ err, reason }, "Failed to record security event");
  }
  void maybeAutoBlock(clientIp(req), reason);
}

// ── Auto-block repeat offenders ──────────────────────────────────────────────
// Any rate limiter tripping repeatedly from the same IP within a short window
// is treated as an active attack/abuse attempt rather than a one-off mistake,
// and the IP is blocked automatically — an admin doesn't have to be watching
// the Security page in real time to stop it.

const RATE_LIMIT_REASONS = new Set([
  "checkout_rate_limit",
  "track_order_rate_limit",
  "admin_login_rate_limit",
  "global_rate_limit",
]);
const AUTO_BLOCK_THRESHOLD = 5;
const AUTO_BLOCK_WINDOW_MS = 10 * 60_000;

const tripCounts = new Map<string, { count: number; windowStart: number }>();

// Never auto-block loopback/local addresses — seeing one usually means a
// proxy in front of the app isn't forwarding the real client IP (so every
// request looks like it comes from the same place), not a real attacker.
// Blocking it would take down the whole site for everyone at once.
const NEVER_BLOCK = new Set(["unknown", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);

async function maybeAutoBlock(ip: string, reason: string): Promise<void> {
  if (!RATE_LIMIT_REASONS.has(reason) || NEVER_BLOCK.has(ip)) return;

  const now = Date.now();
  const entry = tripCounts.get(ip);
  if (!entry || now - entry.windowStart > AUTO_BLOCK_WINDOW_MS) {
    tripCounts.set(ip, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
  if (entry.count < AUTO_BLOCK_THRESHOLD) return;

  tripCounts.delete(ip);
  if (blockedIpCache.has(ip)) return; // already blocked, nothing to do

  try {
    await db
      .insert(blockedIpsTable)
      .values({
        ip,
        reason: `Auto-blocked: ${entry.count} rate-limit hits in ${Math.round(AUTO_BLOCK_WINDOW_MS / 60_000)} minutes (${reason})`,
      })
      .onConflictDoNothing();
    await invalidateBlockedIpCache();
    logger.warn({ ip, reason, count: entry.count }, "Auto-blocked IP after repeated rate-limit hits");
  } catch (err) {
    logger.error({ err, ip, reason }, "Failed to auto-block IP");
  }
}

// ── Blocked-IP enforcement ──────────────────────────────────────────────────
// Refreshed from the DB every 30s rather than queried per-request, so a
// blocked-IP check never adds real latency or DB load to normal traffic.

let blockedIpCache = new Set<string>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

async function refreshBlockedIpCache(): Promise<void> {
  try {
    const rows = await db.select({ ip: blockedIpsTable.ip }).from(blockedIpsTable);
    blockedIpCache = new Set(rows.map((r) => r.ip));
    cacheLoadedAt = Date.now();
  } catch (err) {
    logger.error({ err }, "Failed to refresh blocked-IP cache");
  }
}

/** Call after an admin blocks/unblocks an IP so the change applies immediately. */
export async function invalidateBlockedIpCache(): Promise<void> {
  await refreshBlockedIpCache();
}

export async function blockBannedIps(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await refreshBlockedIpCache();
  }
  const ip = clientIp(req);
  if (blockedIpCache.has(ip)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  next();
}

// ── Rate limiters ────────────────────────────────────────────────────────────
// Each limiter logs a security event on the request that trips it, so the
// admin Security page shows exactly who's hammering which endpoint.

export const checkoutRateLimit = rateLimit({
  windowMs: 10 * 60_000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders placed — please wait a few minutes and try again" },
  handler: (req, res, _next, options) => {
    void logSecurityEvent(req, "checkout_rate_limit");
    res.status(options.statusCode).json(options.message);
  },
});

export const trackOrderRateLimit = rateLimit({
  windowMs: 5 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many lookups — please wait a few minutes and try again" },
  handler: (req, res, _next, options) => {
    void logSecurityEvent(req, "track_order_rate_limit");
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Blanket safety net across every API route. Specific limiters above are
 * tighter and cover the sensitive endpoints (checkout, order lookup, admin
 * login); this one exists purely so a single IP hammering the API with
 * arbitrary/varied requests (scraping, scripted abuse, a runaway client)
 * can't pile up enough load to degrade the server for everyone else.
 */
export const globalApiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
  handler: (req, res, _next, options) => {
    void logSecurityEvent(req, "global_rate_limit");
    res.status(options.statusCode).json(options.message);
  },
});

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait and try again" },
  handler: (req, res, _next, options) => {
    void logSecurityEvent(req, "admin_login_rate_limit");
    res.status(options.statusCode).json(options.message);
  },
});
