import { api } from './api';

export interface PromoStatus {
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  daysRemaining: number;
  claimedCount: number;
  pausedReason?: string;
}

export interface PromoToken {
  qrDataUrl: string;
  expiresInSeconds: number;
}

export interface PromoClaimResult {
  code: string;
  discountPercent: number;
}

// Public — polled by PromoBanner (landing page widget) to decide whether to
// render at all, and to show the two live counters.
export const fetchPromoStatus = async (): Promise<PromoStatus> => {
  const res = await api.get<{ success: true; data: PromoStatus }>('/promo/status');
  return res.data.data;
};

// Public — called just-in-time, right as a banner "pass" starts, never
// pre-fetched far in advance. Throws (via axios) with PROMO_NOT_ACTIVE if the
// campaign isn't currently running.
export const fetchPromoToken = async (): Promise<PromoToken> => {
  const res = await api.get<{ success: true; data: PromoToken }>('/promo/token');
  return res.data.data;
};

// Public — the claim page's submit. Throws on an expired/reused token
// (PROMO_TOKEN_INVALID) or an email that's already claimed one
// (PROMO_ALREADY_CLAIMED) — callers should catch and show via getApiErrorMessage.
export const claimPromoCode = async (token: string, email: string): Promise<PromoClaimResult> => {
  const res = await api.post<{ success: true; data: PromoClaimResult }>('/promo/claim', { token, email });
  return res.data.data;
};

// Admin — Settings page's launch control.
export const adminFetchPromoStatus = async (): Promise<PromoStatus> => {
  const res = await api.get<{ success: true; data: PromoStatus }>('/admin/promo/status');
  return res.data.data;
};

export const adminLaunchPromoCampaign = async (): Promise<{ startedAt: string; endsAt: string | null }> => {
  const res = await api.post<{ success: true; data: { startedAt: string; endsAt: string | null } }>('/admin/promo/launch');
  return res.data.data;
};

// Admin — Settings page's pause/resume toggle. Doesn't touch the 10-day
// clock, just gates whether the campaign counts as live right now.
export const adminSetPromoActive = async (active: boolean, reason?: string): Promise<PromoStatus> => {
  const res = await api.put<{ success: true; data: PromoStatus }>('/admin/promo/active', { active, reason });
  return res.data.data;
};
