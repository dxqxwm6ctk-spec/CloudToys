/**
 * Bearer token storage for the admin dashboard.
 *
 * Used instead of relying solely on the `admin_session` cookie: when the
 * admin frontend and API are deployed on different domains (e.g. Netlify +
 * Heroku), browsers treat that cookie as third-party and block it by
 * default (Safari ITP, Chrome's third-party cookie deprecation) — login
 * appears to succeed but every following request comes back unauthenticated.
 * A token in localStorage sent via the `Authorization` header sidesteps
 * that entirely.
 */
const STORAGE_KEY = "admin_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage unavailable (e.g. private browsing) — the cookie
    // fallback still applies for same-origin deployments.
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** Spread into fetch headers to attach the bearer token, if any. */
export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
