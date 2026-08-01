/**
 * Returns the correct API base for fetch calls.
 *
 * - Replit (dev/production):  BASE_URL is "/admin-dashboard/", API lives at origin root — use "".
 * - Netlify / standalone:     Set VITE_API_BASE_URL to your deployed API server URL
 *                             (e.g. "https://api.cloudtoys.com").  All relative /api/…
 *                             calls will be prefixed automatically.
 */
export function getApiBase(): string {
  const external = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (external) return external.replace(/\/+$/, '');
  // On Replit the admin is at /admin-dashboard/ but the API is at the origin root,
  // so we intentionally return "" (empty string) to keep /api/… paths unmodified.
  return '';
}
