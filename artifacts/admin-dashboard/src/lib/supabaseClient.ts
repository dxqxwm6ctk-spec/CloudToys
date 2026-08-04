import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client used only to drive "Sign in with Google" for the admin
 * dashboard. The resulting Supabase session is exchanged server-side
 * (POST /api/admin/auth/google) against the ADMIN_ALLOWED_EMAILS allowlist —
 * this client never grants admin access by itself.
 */
const url = import.meta.env.SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'SUPABASE_URL / SUPABASE_ANON_KEY are not set — Google sign-in will not work until they are configured.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');
