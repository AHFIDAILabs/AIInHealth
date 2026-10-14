import { describe, it, expect } from 'vitest';
import { classifyRegistrationChannel, isFreeRegistration } from '../utils/registrationChannel.js';

describe('classifyRegistrationChannel', () => {
  it('classifies an invited_delegate ticketCategory as sponsored', () => {
    expect(classifyRegistrationChannel({ ticketCategory: 'invited_delegate' })).toBe('sponsored');
  });

  it('classifies a redeemed scholarship code as sponsored, regardless of ticketCategory', () => {
    expect(classifyRegistrationChannel({ ticketCategory: 'nigerian_professional', accessCodeType: 'scholarship' })).toBe('sponsored');
  });

  it('classifies a 100%-off promo code as promo', () => {
    expect(classifyRegistrationChannel({ accessCodeType: 'promo', discountPercent: 100 })).toBe('promo');
  });

  it('does NOT classify a partial-discount promo code as promo (or anything else)', () => {
    expect(classifyRegistrationChannel({ accessCodeType: 'promo', discountPercent: 50 })).toBeNull();
  });

  it('classifies a free RSVP-confirmed registration with no code as rsvp_invited', () => {
    expect(classifyRegistrationChannel({ paymentStatus: 'not_required', rsvpRespondedAt: new Date() })).toBe('rsvp_invited');
  });

  it('classifies a fully-comped RSVP-confirmed registration as rsvp_invited via discountPercent too', () => {
    expect(classifyRegistrationChannel({ discountPercent: 100, rsvpRespondedAt: new Date() })).toBe('rsvp_invited');
  });

  it('does not classify an RSVP response on a registration that still owes payment', () => {
    expect(classifyRegistrationChannel({ paymentStatus: 'unpaid', rsvpRespondedAt: new Date() })).toBeNull();
  });

  it('returns null for a plain paid registration with no code and no RSVP', () => {
    expect(classifyRegistrationChannel({ ticketCategory: 'vip', paymentStatus: 'paid' })).toBeNull();
  });

  it('prefers sponsored over rsvp_invited when both conditions happen to be true', () => {
    expect(
      classifyRegistrationChannel({ ticketCategory: 'invited_delegate', paymentStatus: 'not_required', rsvpRespondedAt: new Date() })
    ).toBe('sponsored');
  });
});

describe('isFreeRegistration', () => {
  it('is true for paymentStatus not_required', () => {
    expect(isFreeRegistration({ paymentStatus: 'not_required' })).toBe(true);
  });

  it('is true for a 100%-comped discountPercent, regardless of paymentStatus', () => {
    expect(isFreeRegistration({ paymentStatus: 'unpaid', discountPercent: 100 })).toBe(true);
  });

  it('is false for a paid registration', () => {
    expect(isFreeRegistration({ paymentStatus: 'paid' })).toBe(false);
  });

  it('is false for a partial discount — still a real (discounted) paid seat', () => {
    expect(isFreeRegistration({ paymentStatus: 'unpaid', discountPercent: 50 })).toBe(false);
  });
});
