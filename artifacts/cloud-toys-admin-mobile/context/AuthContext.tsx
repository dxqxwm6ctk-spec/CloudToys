import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiUrl,
  clearStoredAdminToken,
  getStoredAdminToken,
  readApiError,
  storeAdminToken,
} from '@/lib/auth';

export type AdminRole = 'admin' | 'manager' | 'supervisor';

export interface AdminIdentity {
  username: string;
  role: AdminRole;
}

interface AuthContextValue {
  identity: AdminIdentity | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchIdentity(): Promise<AdminIdentity | null> {
  const token = await getStoredAdminToken();
  if (!token) return null;

  const response = await fetch(apiUrl('/api/admin/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await clearStoredAdminToken();
    return null;
  }

  return await response.json() as AdminIdentity;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      setIdentity(await fetchIdentity());
    } catch {
      setIdentity(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(apiUrl('/api/admin/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw await readApiError(response, 'Unable to sign in');
    }

    const data = await response.json() as AdminIdentity & { token?: string };
    if (!data.token) {
      throw new Error('The server did not return a session token');
    }

    await storeAdminToken(data.token);
    setIdentity({ username: data.username, role: data.role });
  }, []);

  const logout = useCallback(async () => {
    const token = await getStoredAdminToken();
    await fetch(apiUrl('/api/admin/auth/logout'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).catch(() => undefined);
    await clearStoredAdminToken();
    setIdentity(null);
  }, []);

  const value = useMemo(
    () => ({ identity, isLoading, login, logout, refreshSession }),
    [identity, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}