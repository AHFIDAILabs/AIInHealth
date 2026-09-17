import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as delegateService from '../services/delegate.service';
import type { DelegateMe } from '../services/delegate.service';
import { clearCachedTicketQr } from '../lib/ticketQrCache';

interface DelegateAuthContextValue {
  delegate: DelegateMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const DelegateAuthContext = createContext<DelegateAuthContextValue | undefined>(undefined);

export const DelegateAuthProvider = ({ children }: { children: ReactNode }) => {
  const [delegate, setDelegate] = useState<DelegateMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await delegateService.fetchDelegateMe();
      setDelegate(me);
    } catch {
      setDelegate(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    // Clear local state regardless of whether the API call succeeds — a network
    // blip or an already-expired session shouldn't leave Sign Out looking like it
    // silently did nothing.
    try {
      await delegateService.delegateLogout();
    } finally {
      setDelegate(null);
      // Shared/public-device hygiene — see ticketQrCache.ts.
      clearCachedTicketQr();
    }
  }, []);

  return (
    <DelegateAuthContext.Provider value={{ delegate, isAuthenticated: !!delegate, isLoading, refresh, logout }}>
      {children}
    </DelegateAuthContext.Provider>
  );
};

export const useDelegateAuth = (): DelegateAuthContextValue => {
  const ctx = useContext(DelegateAuthContext);
  if (!ctx) throw new Error('useDelegateAuth must be used within DelegateAuthProvider');
  return ctx;
};
