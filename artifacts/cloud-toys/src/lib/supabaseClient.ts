import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for customer-facing auth (Google sign-in) on the
 * storefront. Uses the public anon key — safe to expose in the browser.
 * Session is persisted in localStorage and OAuth redirect tokens are parsed
 * automatically (both are supabase-js defaults).
 */
const url = import.meta.env.SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'SUPABASE_URL / SUPABASE_ANON_KEY are not set — Google sign-in will not work until they are configured.',
  );
}

// Fall back to a syntactically valid placeholder so the client can be
// constructed even when Supabase isn't configured yet — real requests will
// simply fail until SUPABASE_URL / SUPABASE_ANON_KEY are set.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');
