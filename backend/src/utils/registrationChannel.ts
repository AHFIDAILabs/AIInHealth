import type { FilterQuery } from 'mongoose';
import type { RegistrationDoc } from '../models/Registration.model.js';

interface ChannelClassifiable {
  ticketCategory?: string | null;
  accessCodeType?: string | null;
  discountPercent?: number | null;
  rsvpRespondedAt?: Date | null;
  paymentStatus?: string | null;
}

// Three admin-facing "how did this free/comp seat happen" groupings, for the
// Registration Channels page (registrationChannels.controller.ts) and the
// eventual check-in badge-printing API. Every other comped path
// (keynote_speaker/complimentary/staff codes) intentionally has no channel —
// only these three are what management asked to see broken out and tagged.
export const REGISTRATION_CHANNELS = ['sponsored', 'promo', 'rsvp_invited'] as const;
export type RegistrationChannel = (typeof REGISTRATION_CHANNELS)[number];

// What a printed name tag should say for someone in this channel — 'sponsored'
// is deliberately the bare word "Sponsored" (not "Sponsored Delegate" or the
// raw 'invited_delegate' ticketCategory) per management's explicit ask.
export const REGISTRATION_CHANNEL_LABELS: Record<RegistrationChannel, string> = {
  sponsored: 'Sponsored',
  promo: 'Promo',
  rsvp_invited: 'Invited Guest',
};

// Same three conditions as registrationChannelFilter below, evaluated in JS
// against an already-fetched registration — backs the list/export's own
// "Channel" column so every row can self-label without a second query. Must
// stay in sync with registrationChannelFilter (covered by a shared unit test
// asserting every fixture classifies the same way through both).
export const classifyRegistrationChannel = (reg: ChannelClassifiable): RegistrationChannel | null => {
  if (reg.ticketCategory === 'invited_delegate' || reg.accessCodeType === 'scholarship') return 'sponsored';
  if (reg.accessCodeType === 'promo' && reg.discountPercent === 100) return 'promo';
  if (reg.rsvpRespondedAt && (reg.paymentStatus === 'not_required' || reg.discountPercent === 100)) return 'rsvp_invited';
  return null;
};

// Broad "did this seat cost them nothing" signal — unlike the three named
// channels above (which only cover specific, reportable free PATHS), this
// is true for every free registration regardless of why: a free ticket
// category (government_official/accredited_media) with no code at all, OR
// any 100%-comped code redemption (scholarship-100, promo, keynote_speaker,
// complimentary, bulk_invite). Backs the badge-printing QR colour cue
// (checkin.controller.ts's getBadge) — paid vs free, independent of which
// specific channel a free seat came through.
export const isFreeRegistration = (reg: { paymentStatus?: string | null; discountPercent?: number | null }): boolean =>
  reg.paymentStatus === 'not_required' || reg.discountPercent === 100;

// Mongo query fragment per channel, for filtering at the DB level (the admin
// list/export endpoints' `channel` query param) rather than pulling every
// registration into memory to re-run the JS predicate above.
//
// rsvp_invited doesn't need to additionally exclude the sponsored/promo
// conditions: both of those redeem a fully-comping code at creation time,
// which auto-confirms the registration immediately (registration.controller.ts
// create()'s isFullyComped branch) and skips 'pending' entirely — so a
// sponsored/promo registration can never receive (or need) the pending-only
// RSVP reconfirmation nudge in the first place. If that invariant ever
// changes, this filter and classifyRegistrationChannel's precedence above
// would both need to start excluding each other's matches explicitly.
export const registrationChannelFilter = (channel: RegistrationChannel): FilterQuery<RegistrationDoc> => {
  switch (channel) {
    case 'sponsored':
      return { $or: [{ ticketCategory: 'invited_delegate' }, { accessCodeType: 'scholarship' }] };
    case 'promo':
      return { accessCodeType: 'promo', discountPercent: 100 };
    case 'rsvp_invited':
      return { rsvpRespondedAt: { $exists: true }, $or: [{ paymentStatus: 'not_required' }, { discountPercent: 100 }] };
  }
};
