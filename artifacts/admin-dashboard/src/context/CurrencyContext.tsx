import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatUSD, formatJOD } from '@/lib/currency';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

export type CurrencyMode = 'USD' | 'JOD';

interface CurrencyContextValue {
  mode: CurrencyMode;
  setMode: (mode: CurrencyMode) => void;
  renderPrice: (usdAmount: number) => React.ReactNode;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

async function fetchCurrencyMode(): Promise<CurrencyMode> {
  try {
    const res = await fetch(`${getApiBase()}/api/admin/settings/currency`, {
      credentials: 'include',
      headers: { ...authHeader() },
    });
    if (!res.ok) return 'USD';
    const data = await res.json();
    return data.value === 'JOD' ? 'JOD' : 'USD';
  } catch {
    return 'USD';
  }
}

async function saveCurrencyMode(mode: CurrencyMode): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/admin/settings/currency`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ value: mode }),
    });
  } catch {
    // best-effort
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<CurrencyMode>('USD');

  // Load preference from DB on mount
  useEffect(() => {
    fetchCurrencyMode().then(setModeState);
  }, []);

  const setMode = (next: CurrencyMode) => {
    setModeState(next);
    saveCurrencyMode(next);
  };

  const renderPrice = (usdAmount: number): React.ReactNode => {
    if (mode === 'JOD') {
      return <span>{formatJOD(usdAmount)}</span>;
    }
    return (
      <>
        <div>{formatUSD(usdAmount)}</div>
        <div className="text-xs text-muted-foreground">{formatJOD(usdAmount)}</div>
      </>
    );
  };

  return (
    <CurrencyContext.Provider value={{ mode, setMode, renderPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
