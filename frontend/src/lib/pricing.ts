import type { TicketCategory } from '../services/registration.service';

// Mirrors backend/src/config/pricing.ts — display-only, the backend is the source
// of truth that actually charges. Early bird pricing closed 2026-08-31.
export const TICKET_PRICE_NGN: Record<TicketCategory, number> = {
  international_delegate: 200_000,
  nigerian_professional: 200_000,
  student_researcher: 75_000,
  vip: 350_000,
  government_official: 0,
  accredited_media: 0,
};

export const isFreeTicketCategory = (category: TicketCategory): boolean => TICKET_PRICE_NGN[category] === 0;

export const formatNaira = (amount: number): string =>
  amount === 0 ? 'Free' : `₦${amount.toLocaleString('en-NG')}`;
