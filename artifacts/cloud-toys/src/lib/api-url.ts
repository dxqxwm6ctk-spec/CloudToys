/**
 * Returns the correct API base for fetch calls.
 *
 * - Replit (dev/production):  BASE_URL is "/", so API lives at the same origin — no prefix needed.
 * - Netlify / standalone:     Set VITE_API_BASE_URL to your deployed API server URL
 *                             (e.g. "https://api.cloudtoys.com").  All relative /api/…
 *                             calls will be prefixed automatically.
 */
export function getApiBase(): string {
  const external = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (external) return external.replace(/\/+$/, '');
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}
