/**
 * Email alerts for suspicious activity, so an admin finds out about an
 * attack even when nobody has the Security dashboard open.
 *
 * Deliberately noisy events (rate-limit trips) are cheap and frequent —
 * emailing on every one would flood the inbox and train the admin to ignore
 * it. Instead we only alert once an IP crosses a real "this looks like an
 * attack, not a fluke" threshold, and then stay quiet about that same IP for
 * a cooldown period even if it keeps tripping.
 */
import { Resend } from "resend";
import { logger } from "./logger";

// Same IP hits a rate limiter this many times within the window before we
// consider it worth an email (well above the 5-hit auto-block threshold in
// security.ts, so by the time this fires the IP is almost always already
// blocked — the email is a heads-up, not the first line of defense).
const ALERT_WINDOW_MS = 5 * 60_000;
const ALERT_THRESHOLD = 25;

// Once we've emailed about an IP, don't email again about it for this long,
// even if it keeps generating events.
const ALERT_COOLDOWN_MS = 20 * 60_000;

interface TrackedEvent {
  time: number;
  method: string;
  path: string;
  email: string | null;
}

const ipEvents = new Map<string, TrackedEvent[]>();
const lastAlertAt = new Map<string, number>();

let resendClient: Resend | null | undefined;
function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  resendClient = apiKey ? new Resend(apiKey) : null;
  if (!resendClient) {
    logger.warn("RESEND_API_KEY not set — suspicious-activity email alerts are disabled");
  }
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Record one suspicious request against its IP and, if that IP just crossed
 * ALERT_THRESHOLD requests within ALERT_WINDOW_MS (and isn't in its
 * cooldown), send the admin an email. Never throws.
 */
export async function trackAndMaybeAlert(params: {
  ip: string;
  method: string;
  path: string;
  email: string | null;
  isBlocked: boolean;
}): Promise<void> {
  const { ip, method, path, email, isBlocked } = params;
  const now = Date.now();

  const events = (ipEvents.get(ip) ?? []).filter((e) => now - e.time < ALERT_WINDOW_MS);
  events.push({ time: now, method, path, email });
  ipEvents.set(ip, events);

  if (events.length < ALERT_THRESHOLD) return;

  const lastAlert = lastAlertAt.get(ip) ?? 0;
  if (now - lastAlert < ALERT_COOLDOWN_MS) return;

  const to = process.env.ALERT_EMAIL_TO;
  const client = getResendClient();
  if (!client || !to) return;

  // Set the cooldown before sending: if two requests cross the threshold in
  // the same instant we only want one email attempt in flight.
  lastAlertAt.set(ip, now);

  const endpoints = [...new Set(events.map((e) => `${e.method} ${e.path}`))];
  const signedInEmails = [...new Set(events.map((e) => e.email).filter((e): e is string => !!e))];
  const firstSeen = new Date(events[0]!.time);
  const lastSeen = new Date(events[events.length - 1]!.time);

  const html = `
    <div style="font-family: sans-serif; direction: rtl; text-align: right; max-width: 560px;">
      <h2 style="color:#b91c1c;">🚨 نشاط مشبوه متكرر</h2>
      <p>تم رصد ${events.length} محاولة من نفس العنوان خلال ${Math.round(ALERT_WINDOW_MS / 60_000)} دقائق.</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding:4px 8px;font-weight:bold;">عنوان الـ IP</td><td style="padding:4px 8px;">${escapeHtml(ip)}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">الوقت</td><td style="padding:4px 8px;">${firstSeen.toLocaleString("en-GB")} — ${lastSeen.toLocaleString("en-GB")}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">عدد المحاولات</td><td style="padding:4px 8px;">${events.length}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">المسارات المستهدفة</td><td style="padding:4px 8px;">${endpoints.map(escapeHtml).join("<br>")}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">إيميل مستخدم مسجّل دخول</td><td style="padding:4px 8px;">${signedInEmails.length ? signedInEmails.map(escapeHtml).join(", ") : "لا يوجد"}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">تم الحظر تلقائياً؟</td><td style="padding:4px 8px;">${isBlocked ? "نعم ✅" : "لا ❌"}</td></tr>
      </table>
      <p style="margin-top:16px;color:#6b7280;font-size:13px;">لن يصلك تنبيه آخر عن نفس العنوان قبل ${Math.round(ALERT_COOLDOWN_MS / 60_000)} دقيقة.</p>
    </div>
  `;

  try {
    // The Resend SDK resolves normally even on API-level failures (e.g. an
    // unverified sending domain) — it reports them via `error`, it does not
    // throw. Both paths must be handled or a rejected send silently looks
    // like a sent one.
    const { error } = await client.emails.send({
      from: "Cloud Toys Security <onboarding@resend.dev>",
      to: to.trim().toLowerCase(),
      subject: `🚨 تنبيه أمني: ${events.length} محاولة مشبوهة من ${ip}`,
      html,
    });
    if (error) throw error;
    logger.warn({ ip, count: events.length }, "Sent suspicious-activity email alert");
  } catch (err) {
    // The send failed — clear the cooldown so the next trip retries instead
    // of silently staying quiet for the full cooldown window.
    lastAlertAt.delete(ip);
    logger.error({ err, ip }, "Failed to send suspicious-activity email alert");
  }
}
