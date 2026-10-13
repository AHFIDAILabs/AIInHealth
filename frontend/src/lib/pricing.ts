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
  staff: 0,
  abstract_presenter: 0,
  abstract_reviewer: 0,
  invited_delegate: 0,
};

export const isFreeTicketCategory = (category: TicketCategory): boolean => TICKET_PRICE_NGN[category] === 0;

// Ticket-PRICE context only — ₦0 here genuinely means "this category costs
// nothing" (government_official, accredited_media, staff, etc.).
export const formatNaira = (amount: number): string =>
  amount === 0 ? 'Free' : `₦${amount.toLocaleString('en-NG')}`;

// Revenue/amount-COLLECTED context — ₦0 here means "nothing collected yet",
// never "this is free" (a 50%-off registration that hasn't paid is still
// ₦0 collected so far, not a free seat). Using formatNaira's "Free" fallback
// for a collected-revenue figure was a real reported bug (PaymentsPage.tsx's
// Discount Tier Detail showing "Free" under a discount tier where most
// recipients simply hadn't paid yet) — this formatter exists specifically so
// that mistake can't recur in any other revenue-collected display.
export const formatNairaStrict = (amount: number): string => `₦${amount.toLocaleString('en-NG')}`;
