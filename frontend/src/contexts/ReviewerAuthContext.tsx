import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as reviewerService from '../services/reviewer.service';
import type { ReviewerMe } from '../services/reviewer.service';

interface ReviewerAuthContextValue {
  reviewer: ReviewerMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const ReviewerAuthContext = createContext<ReviewerAuthContextValue | undefined>(undefined);

// Exact mirror of DelegateAuthContext.tsx, pointed at the reviewer portal's
// own cookie-authenticated session.
export const ReviewerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [reviewer, setReviewer] = useState<ReviewerMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await reviewerService.fetchReviewerMe();
      setReviewer(me);
    } catch {
      setReviewer(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await reviewerService.reviewerLogout();
    } finally {
      setReviewer(null);
    }
  }, []);

  return (
    <ReviewerAuthContext.Provider value={{ reviewer, isAuthenticated: !!reviewer, isLoading, refresh, logout }}>
      {children}
    </ReviewerAuthContext.Provider>
  );
};

export const useReviewerAuth = (): ReviewerAuthContextValue => {
  const ctx = useContext(ReviewerAuthContext);
  if (!ctx) throw new Error('useReviewerAuth must be used within ReviewerAuthProvider');
  return ctx;
};
