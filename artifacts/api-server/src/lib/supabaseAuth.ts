// Polyfill WebSocket for Node.js < 22 (supabase-js v2.111+ requires it)
import { WebSocket } from "ws";
if (!("WebSocket" in globalThis)) {
  // @ts-expect-error — ws is compatible enough for supabase-js realtime
  globalThis.WebSocket = WebSocket;
}
import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { logger } from "./logger";

let _authClient: ReturnType<typeof createClient> | null = null;

function getAuthClient() {
  if (_authClient) return _authClient;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("SUPABASE_URL not set.");
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY not set.");
  _authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  return _authClient;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/** Verify a Supabase access token (JWT) and return the user, or null. */
export async function verifySupabaseToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  try {
    const { data, error } = await getAuthClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch (err) {
    logger.error({ err }, "Failed to verify Supabase token");
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: AuthenticatedUser;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Lazily create/refresh the customer's profile row (id + email) so the
 * admin "Users" list has something to show for every authenticated
 * customer, and returns whether the account is currently banned. Never
 * throws — a profile-sync failure shouldn't block the request; it only
 * means banned-status can't be confirmed, so we fail open on the sync but
 * still enforce a ban when the row is readable.
 */
async function syncProfileAndCheckBanned(user: AuthenticatedUser): Promise<boolean> {
  try {
    const [existing] = await db
      .select({ banned: profilesTable.banned })
      .from(profilesTable)
      .where(eq(profilesTable.id, user.id));

    if (existing) {
      if (user.email) {
        await db
          .update(profilesTable)
          .set({ email: user.email })
          .where(eq(profilesTable.id, user.id));
      }
      return existing.banned;
    }

    await db
      .insert(profilesTable)
      .values({ id: user.id, email: user.email })
      .onConflictDoNothing({ target: profilesTable.id });
    return false;
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to sync profile / check banned status");
    return false;
  }
}

/** Requires a valid, non-banned customer session; 401/403s otherwise. */
export async function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const user = await verifySupabaseToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  const banned = await syncProfileAndCheckBanned(user);
  if (banned) {
    res.status(403).json({ error: "This account has been suspended. Contact support for help." });
    return;
  }
  req.customer = user;
  next();
}

/** Attaches req.customer if a valid session is present, but never rejects. */
export async function attachCustomerIfPresent(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (token) {
    const user = await verifySupabaseToken(token);
    if (user) req.customer = user;
  }
  next();
}
