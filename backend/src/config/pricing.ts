import type { TicketCategory } from '../types/enums.js';

// Naira, flat rates — early bird pricing closed 2026-08-31, so there is only one
// price per category now. government_official and accredited_media are comped
// (credential-vetted by staff instead of paid for), not discounted to near-zero.
export const TICKET_PRICE_NGN: Record<TicketCategory, number> = {
  international_delegate: 200_000,
  nigerian_professional: 200_000,
  student_researcher: 75_000,
  vip: 350_000,
  government_official: 0,
  accredited_media: 0,
};

export const isFreeTicketCategory = (category: TicketCategory): boolean => TICKET_PRICE_NGN[category] === 0;

// Paystack amounts are in kobo (smallest currency unit).
export const nairaToKobo = (naira: number): number => Math.round(naira * 100);

export const priceForRegistration = (category: TicketCategory, attendeeCount: number): number =>
  TICKET_PRICE_NGN[category] * Math.max(1, attendeeCount);
