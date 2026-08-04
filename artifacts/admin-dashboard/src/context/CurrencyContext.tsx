import React, { createContext, useContext, useState } from 'react';
import { formatUSD, formatJOD } from '@/lib/currency';

export type CurrencyMode = 'USD' | 'JOD';

interface CurrencyContextValue {
  mode: CurrencyMode;
  setMode: (mode: CurrencyMode) => void;
  /** Renders a price according to the current mode */
  renderPrice: (usdAmount: number) => React.ReactNode;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'admin-currency-mode';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<CurrencyMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'JOD' ? 'JOD' : 'USD';
  });

  const setMode = (next: CurrencyMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
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
