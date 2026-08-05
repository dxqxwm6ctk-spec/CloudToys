import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getApiBase } from '@/lib/api-url';
import { setAuthToken, clearAuthToken, authHeader } from '@/lib/auth-token';
import { supabase } from '@/lib/supabaseClient';

export type AdminRole = 'admin' | 'manager' | 'supervisor';

interface AuthState {
  username: string | null;
  role: AdminRole | null;
  isLoading: boolean;
  googleError: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const BASE = getApiBase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  // Guards against exchanging the same Supabase session twice (initial
  // check + onAuthStateChange can both fire for the same session).
  const exchangingRef = useRef(false);

  const exchangeGoogleSession = useCallback(async (accessToken: string) => {
    if (exchangingRef.current) return;
    exchangingRef.current = true;
    try {
      const res = await fetch(`${BASE}/api/admin/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Google sign-in failed');
      }
      const data = (await res.json()) as { username: string; role?: AdminRole; token?: string };
      if (data.token) setAuthToken(data.token);
      setUsername(data.username);
      setRole(data.role ?? null);
      setGoogleError(null);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Google sign-in failed');
      // The Supabase session identified a real Google account, but it's not
      // an authorized admin — sign it out so a retry starts clean.
      await supabase.auth.signOut().catch(() => {});
    } finally {
      exchangingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Existing admin session (password login or a previously
      // exchanged Google login) — cheapest check, try it first.
      const meRes = await fetch(`${BASE}/api/admin/auth/me`, {
        credentials: 'include',
        headers: authHeader(),
      }).catch(() => null);
      const meData = meRes?.ok ? ((await meRes.json()) as { username: string; role?: AdminRole }) : null;
      if (cancelled) return;
      if (meData) {
        setUsername(meData.username);
        setRole(meData.role ?? null);
        setIsLoading(false);
        return;
      }

      // 2. No admin session yet — if the user just completed "Sign in with
      // Google" (redirected back with a Supabase session), exchange it.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        await exchangeGoogleSession(data.session.access_token);
      }
      if (!cancelled) setIsLoading(false);
    })();

    // supabase-js parses the OAuth redirect hash asynchronously; if it
    // resolves after the check above already ran, this listener catches it.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        exchangeGoogleSession(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [exchangeGoogleSession]);

  const login = useCallback(async (u: string, p: string) => {
    const res = await fetch(`${BASE}/api/admin/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? 'Login failed');
    }
    const data = (await res.json()) as { username: string; role?: AdminRole; token?: string };
    if (data.token) setAuthToken(data.token);
    setUsername(data.username);
    setRole(data.role ?? null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setGoogleError(null);
    // Fixed to the admin origin (not `window.location.href`, which would vary
    // by path/query) so it can be registered as an exact entry in Supabase's
    // Redirect URLs allow-list. If a redirectTo isn't in that allow-list,
    // Supabase silently falls back to the project's Site URL instead of
    // erroring — which is what sends admin logins to the storefront when the
    // storefront happens to be the configured Site URL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setGoogleError(error.message);
    // On success the browser navigates away to Google — nothing else to do here.
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BASE}/api/admin/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeader(),
    }).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    clearAuthToken();
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ username, isLoading, googleError, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
