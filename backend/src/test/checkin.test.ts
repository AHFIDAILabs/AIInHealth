import { describe, it, expect } from 'vitest';
import { useTestDb, seedAndLoginAdmin } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { qrDataUrlForToken } from '../services/qr.service.js';

describe('POST /api/v1/admin/check-in/manual/:id — idempotency', () => {
  useTestDb();

  it('checking the same delegate in twice is rejected the second time, not double-processed', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Delegate One',
      email: 'delegate1@example.com',
      phone: '+2348055556666',
      country: 'Nigeria',
      status: 'confirmed',
    });

    const first = await officer.post(`/api/v1/admin/check-in/manual/${reg.id}`);
    expect(first.status).toBe(200);

    const second = await officer.post(`/api/v1/admin/check-in/manual/${reg.id}`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_CHECKED_IN');

    const updated = await Registration.findById(reg.id);
    expect(updated?.checkedIn).toBe(true);
  });

  it('returns a clean 404 for a malformed id instead of a 500', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer');
    const res = await officer.post('/api/v1/admin/check-in/manual/not-a-valid-object-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/admin/check-in/manual/:id and /scan — optional gender capture', () => {
  useTestDb();

  it('records a valid gender alongside check-in', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'gender-test-1@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Gender Test One',
      email: 'gender1@example.com',
      phone: '+2348055551111',
      country: 'Nigeria',
      status: 'confirmed',
    });

    const res = await officer.post(`/api/v1/admin/check-in/manual/${reg.id}`).send({ gender: 'female' });
    expect(res.status).toBe(200);
    expect(res.body.data.gender).toBe('female');

    const updated = await Registration.findById(reg.id);
    expect(updated?.gender).toBe('female');
  });

  it('checks in successfully with no gender at all — it is never required', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'gender-test-2@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Gender Test Two',
      email: 'gender2@example.com',
      phone: '+2348055552222',
      country: 'Nigeria',
      status: 'confirmed',
    });

    const res = await officer.post(`/api/v1/admin/check-in/manual/${reg.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.gender).toBeUndefined();
  });

  it('rejects an invalid gender value rather than silently dropping it', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'gender-test-3@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Gender Test Three',
      email: 'gender3@example.com',
      phone: '+2348055553333',
      country: 'Nigeria',
      status: 'confirmed',
    });

    const res = await officer.post(`/api/v1/admin/check-in/manual/${reg.id}`).send({ gender: 'nonbinary-typo' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const unchanged = await Registration.findById(reg.id);
    expect(unchanged?.checkedIn).toBe(false);
    expect(unchanged?.gender).toBeUndefined();
  });

  it('accepts "prefer_not_to_say" and records a group member\'s own gender independently', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'gender-test-4@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'group',
      ticketCategory: 'nigerian_professional',
      fullName: 'Group Lead',
      email: 'gender4@example.com',
      phone: '+2348055554444',
      country: 'Nigeria',
      status: 'confirmed',
      groupAttendees: [{ fullName: 'Group Member Gender', email: 'gender4-member@example.com', qrToken: 'QR-GENDER-MEMBER' }],
    });

    const res = await officer
      .post(`/api/v1/admin/check-in/manual/${reg.id}`)
      .send({ memberIndex: 0, gender: 'prefer_not_to_say' });
    expect(res.status).toBe(200);
    expect(res.body.data.gender).toBe('prefer_not_to_say');

    const updated = await Registration.findById(reg.id);
    expect(updated?.groupAttendees?.[0]?.gender).toBe('prefer_not_to_say');
    expect(updated?.gender).toBeUndefined(); // the primary contact's own field is untouched
  });

  it('records gender via a QR scan check-in too', async () => {
    const scanner = await seedAndLoginAdmin('registrations_officer', 'gender-test-5@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Gender Test Scan',
      email: 'gender5@example.com',
      phone: '+2348055555555',
      country: 'Nigeria',
      status: 'confirmed',
      qrToken: 'QR-GENDER-SCAN',
    });

    const res = await scanner.post('/api/v1/admin/check-in/scan').send({ qrToken: 'QR-GENDER-SCAN', gender: 'male' });
    expect(res.status).toBe(200);
    expect(res.body.data.gender).toBe('male');

    const updated = await Registration.findById(reg.id);
    expect(updated?.gender).toBe('male');
  });
});

describe('GET /api/v1/admin/check-in/badge/:id — badge-print payload', () => {
  useTestDb();

  // Each test below logs in as its own distinct admin email — the real login
  // rate limiter (5 attempts per ip+email per 15min window) is shared across
  // every test FILE in a run, not reset by useTestDb()'s per-test DB wipe, so
  // several tests all reusing the suite-wide default 'registrations_officer@test.local'
  // in one file trips it.
  it('returns name/organization/jobTitle/QR image for the primary contact', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-1@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'staff',
      fullName: 'Oghenerunor Oghiagbepha',
      email: 'badge1@example.com',
      phone: '+2348000000011',
      organization: 'Africa Hub for Innovation & Development',
      jobTitle: 'Special Duties/IT',
      country: 'Nigeria',
      status: 'confirmed',
      qrToken: 'QR-BADGE-PRIMARY',
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Oghenerunor Oghiagbepha');
    expect(res.body.data.organization).toBe('Africa Hub for Innovation & Development');
    expect(res.body.data.jobTitle).toBe('Special Duties/IT');
    expect(res.body.data.qrToken).toBe('QR-BADGE-PRIMARY');
    expect(res.body.data.qrImage).toMatch(/^data:image\/png;base64,/);
    // ticketCategory 'staff' prints on the badge as "Organizer" — one of the
    // 7 fixed print categories (badgeCategory.ts), never the raw value.
    expect(res.body.data.badgeCategory).toBe('Organizer');
  });

  it('a free "invited_delegate" registration prints as the generic "Delegate" category, with the free QR colour', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-2@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'invited_delegate',
      fullName: 'Sponsored Guest',
      email: 'badge2@example.com',
      phone: '+2348000000012',
      country: 'Nigeria',
      status: 'confirmed',
      qrToken: 'QR-BADGE-SPONSORED',
      // paymentStatus defaults to 'not_required' — a genuinely free seat.
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}`);
    expect(res.status).toBe(200);
    // No "Sponsored"/"Invited Guest" wording on a badge any more — this
    // falls through to the generic catch-all, same as any other non-VIP,
    // non-Speaker, non-Organizer, non-Media/Volunteer seat.
    expect(res.body.data.badgeCategory).toBe('Delegate');
    // The only place paid-vs-free still shows up for a Delegate: the QR's
    // own colour, which a plain black encoding of the same token would not match.
    const paidVersion = await qrDataUrlForToken('QR-BADGE-SPONSORED');
    expect(res.body.data.qrImage).not.toBe(paidVersion);
  });

  it('a PAID Delegate prints in the standard QR colour, matching a plain default-colour encoding', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-2b@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'nigerian_professional',
      fullName: 'Paid Delegate',
      email: 'badge2b@example.com',
      phone: '+2348000000099',
      country: 'Nigeria',
      status: 'confirmed',
      paymentStatus: 'paid',
      qrToken: 'QR-BADGE-PAID-DELEGATE',
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.badgeCategory).toBe('Delegate');
    const standardVersion = await qrDataUrlForToken('QR-BADGE-PAID-DELEGATE');
    expect(res.body.data.qrImage).toBe(standardVersion);
  });

  it('a free VIP still prints the standard QR colour — the cue only applies to the Delegate category', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-2c@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'vip',
      fullName: 'Free VIP',
      email: 'badge2c@example.com',
      phone: '+2348000000098',
      country: 'Nigeria',
      status: 'confirmed',
      discountPercent: 100,
      qrToken: 'QR-BADGE-FREE-VIP',
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.badgeCategory).toBe('VIP');
    const standardVersion = await qrDataUrlForToken('QR-BADGE-FREE-VIP');
    expect(res.body.data.qrImage).toBe(standardVersion);
  });

  it('returns a group member\'s own name and own QR token, under the shared organization', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-3@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'group',
      ticketCategory: 'nigerian_professional',
      fullName: 'Group Lead',
      email: 'badge3@example.com',
      phone: '+2348000000013',
      organization: 'Example Org',
      country: 'Nigeria',
      status: 'confirmed',
      qrToken: 'QR-BADGE-LEAD',
      groupAttendees: [{ fullName: 'Group Member One', email: 'member1@example.com', qrToken: 'QR-BADGE-MEMBER1' }],
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}?memberIndex=0`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Group Member One');
    expect(res.body.data.organization).toBe('Example Org');
    expect(res.body.data.qrToken).toBe('QR-BADGE-MEMBER1');
  });

  it('rejects a registration that has no qrToken yet (not confirmed/ticketed)', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-4@test.local');
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Not Yet Ticketed',
      email: 'badge4@example.com',
      phone: '+2348000000014',
      country: 'Nigeria',
      status: 'confirmed', // confirmed, but no qrToken set — e.g. a pre-existing edge case
    });

    const res = await officer.get(`/api/v1/admin/check-in/badge/${reg.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_CONFIRMED');
  });

  it('returns a clean 404 for a malformed id instead of a 500', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer', 'badge-test-5@test.local');
    const res = await officer.get('/api/v1/admin/check-in/badge/not-a-valid-object-id');
    expect(res.status).toBe(404);
  });
});
