import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb, seedAndLoginAdmin } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { AccessCode } from '../models/AccessCode.model.js';
import { VolunteerSettings } from '../models/VolunteerSettings.model.js';

const attendeePayload = {
  type: 'attendee' as const,
  registrationMode: 'individual' as const,
  ticketCategory: 'government_official' as const, // free — keeps this suite focused on registration, not payment
  fullName: 'Amina Yusuf',
  email: 'amina.yusuf@example.com',
  phone: '+2348012345678',
  country: 'Nigeria',
  // government_official is one of ID_VERIFICATION_TICKET_CATEGORIES — any
  // syntactically valid URL satisfies createRegistrationSchema's check, this
  // suite isn't testing the upload step itself.
  idCardUrl: 'https://res.cloudinary.com/demo/image/upload/sample-id.jpg',
};

describe('POST /api/v1/registrations — ID_VERIFICATION_TICKET_CATEGORIES gate', () => {
  useTestDb();

  it('rejects a gated ticket category with no idCardUrl', async () => {
    const { idCardUrl: _omit, ...withoutId } = attendeePayload;
    const res = await request(app).post('/api/v1/registrations').send(withoutId);
    expect(res.status).toBe(422);
  });

  it('accepts a gated category with idCardUrl, and lands pending — not auto-confirmed', async () => {
    const res = await request(app).post('/api/v1/registrations').send(attendeePayload);
    expect(res.status).toBe(201);

    const reg = await Registration.findById(res.body.data.id);
    expect(reg?.idCardUrl).toBe(attendeePayload.idCardUrl);
    expect(reg?.status).toBe('pending');
  });

  it('does not require idCardUrl for a non-gated ticket category', async () => {
    const { idCardUrl: _omit, ...rest } = attendeePayload;
    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...rest, ticketCategory: 'nigerian_professional', email: 'not-gated@example.com' });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/registrations — attendee/exhibitor/sponsor idempotency', () => {
  useTestDb();

  it('creates a new registration on first submit', async () => {
    const res = await request(app).post('/api/v1/registrations').send(attendeePayload);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();

    const count = await Registration.countDocuments({ email: attendeePayload.email });
    expect(count).toBe(1);
  });

  it('returns the SAME registration on an immediate resubmit instead of creating a duplicate', async () => {
    const first = await request(app).post('/api/v1/registrations').send(attendeePayload);
    const second = await request(app).post('/api/v1/registrations').send(attendeePayload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200); // not 201 — nothing new was created
    expect(second.body.data.id).toBe(first.body.data.id);

    const count = await Registration.countDocuments({ email: attendeePayload.email });
    expect(count).toBe(1);
  });

  it('still creates a genuinely separate registration for a different email', async () => {
    await request(app).post('/api/v1/registrations').send(attendeePayload);
    const other = await request(app)
      .post('/api/v1/registrations')
      .send({ ...attendeePayload, email: 'someone.else@example.com', fullName: 'Someone Else' });

    expect(other.status).toBe(201);
    const count = await Registration.countDocuments({ type: 'attendee' });
    expect(count).toBe(2);
  });
});

describe('GET /admin/registrations?type=team — Organizer pool widening', () => {
  useTestDb();

  it('a narrowed ?type=team filter includes both real team registrations and attendee+staff ("Organizer") ones', async () => {
    await Registration.create({ type: 'team', fullName: 'Real Team Member', email: 'team.member@example.com', status: 'confirmed' });
    await Registration.create({
      type: 'attendee',
      ticketCategory: 'staff',
      fullName: 'Organizer Attendee',
      email: 'organizer.attendee@example.com',
      phone: '+2348000000000',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'confirmed',
    });
    await Registration.create({
      type: 'attendee',
      ticketCategory: 'nigerian_professional',
      fullName: 'Plain Attendee',
      email: 'plain.attendee@example.com',
      phone: '+2348000000001',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'confirmed',
    });

    const admin = await seedAndLoginAdmin('super_admin');
    const res = await admin.get('/api/v1/admin/registrations').query({ type: 'team' });

    expect(res.status).toBe(200);
    const emails = res.body.data.map((r: { email: string }) => r.email).sort();
    expect(emails).toEqual(['organizer.attendee@example.com', 'team.member@example.com']);
  });

  it('combines correctly with a simultaneous ?q= search (the $and/$or combination)', async () => {
    await Registration.create({ type: 'team', fullName: 'Findable Name', email: 'findable@example.com', status: 'confirmed' });
    await Registration.create({
      type: 'attendee',
      ticketCategory: 'staff',
      fullName: 'Other Organizer',
      email: 'other.organizer@example.com',
      phone: '+2348000000002',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'confirmed',
    });

    const admin = await seedAndLoginAdmin('super_admin');
    const res = await admin.get('/api/v1/admin/registrations').query({ type: 'team', q: 'Findable' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('findable@example.com');
  });
});

describe('POST /api/v1/registrations — volunteer apply-then-confirm lifecycle', () => {
  useTestDb();

  const volunteerPayload = {
    type: 'volunteer' as const,
    fullName: 'Chidi Okafor',
    email: 'chidi.okafor@example.com',
    phone: '+2348022223333',
  };

  it('applying without a code creates a pending application, not a confirmed registration', async () => {
    const res = await request(app).post('/api/v1/registrations').send(volunteerPayload);
    expect(res.status).toBe(201);

    const reg = await Registration.findOne({ email: volunteerPayload.email });
    expect(reg?.status).toBe('pending');
    expect(reg?.qrToken).toBeFalsy();
  });

  it('reapplying while still pending returns the same application, not a duplicate', async () => {
    const first = await request(app).post('/api/v1/registrations').send(volunteerPayload);
    const second = await request(app).post('/api/v1/registrations').send(volunteerPayload);

    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await Registration.countDocuments({ email: volunteerPayload.email })).toBe(1);
  });

  it('redeeming a valid code promotes the SAME record to confirmed rather than creating a second one', async () => {
    const applied = await request(app).post('/api/v1/registrations').send(volunteerPayload);

    const code = await AccessCode.create({
      code: 'VOL-TEST01',
      type: 'volunteer',
      issuedTo: volunteerPayload.email,
      createdBy: '000000000000000000000001',
    });

    const confirmed = await request(app)
      .post('/api/v1/registrations')
      .send({ ...volunteerPayload, accessCode: code.code });

    expect(confirmed.status).toBe(200); // same doc promoted, not created
    expect(confirmed.body.data.id).toBe(applied.body.data.id);

    const reg = await Registration.findById(applied.body.data.id);
    expect(reg?.status).toBe('confirmed');
    expect(reg?.qrToken).toBeTruthy();
    expect(await Registration.countDocuments({ email: volunteerPayload.email })).toBe(1);

    const usedCode = await AccessCode.findById(code.id);
    expect(usedCode?.status).toBe('used');
  });

  it('rejects a code issued to a different email address', async () => {
    const code = await AccessCode.create({
      code: 'VOL-TEST02',
      type: 'volunteer',
      issuedTo: 'someone-else@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...volunteerPayload, accessCode: code.code });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ACCESS_CODE_EMAIL_MISMATCH');
  });
});

describe('POST /api/v1/registrations — volunteer applications closed', () => {
  useTestDb();

  const volunteerPayload = {
    type: 'volunteer' as const,
    fullName: 'Closed Test',
    email: 'closed-test@example.com',
    phone: '+2348033334444',
  };

  it('rejects a fresh application while closed', async () => {
    await VolunteerSettings.create({ applicationsOpen: false, closedReason: 'Volunteer slots are full.' });

    const res = await request(app).post('/api/v1/registrations').send(volunteerPayload);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VOLUNTEER_APPLICATIONS_CLOSED');
    expect(res.body.error.message).toBe('Volunteer slots are full.');
    expect(await Registration.countDocuments({ email: volunteerPayload.email })).toBe(0);
  });

  it('still lets someone with an already-issued code confirm even while closed', async () => {
    await VolunteerSettings.create({ applicationsOpen: false });
    const code = await AccessCode.create({
      code: 'VOL-CLOSED1',
      type: 'volunteer',
      issuedTo: volunteerPayload.email,
      createdBy: '000000000000000000000001',
    });

    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...volunteerPayload, accessCode: code.code });

    expect(res.status).toBe(201);
    const reg = await Registration.findOne({ email: volunteerPayload.email });
    expect(reg?.status).toBe('confirmed');
  });

  it('allows applying again once reopened', async () => {
    await VolunteerSettings.create({ applicationsOpen: true });
    const res = await request(app).post('/api/v1/registrations').send(volunteerPayload);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/registrations — 10% group-rate access code', () => {
  useTestDb();

  const groupCodeAttendee = { ...attendeePayload, email: 'group-lead@example.com' };

  const createGroupCode = async () =>
    AccessCode.create({
      code: 'GRP-TEST01',
      type: 'scholarship',
      discountPercent: 10,
      issuedTo: groupCodeAttendee.email,
      createdBy: '000000000000000000000001',
    });

  it('rejects the code on an individual registration', async () => {
    const code = await createGroupCode();

    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...groupCodeAttendee, registrationMode: 'individual', accessCode: code.code });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ACCESS_CODE_REQUIRES_GROUP');
    expect(await AccessCode.findById(code.id).then((c) => c?.status)).toBe('unused');
  });

  it('rejects the code on a group of fewer than 5 total attendees', async () => {
    const code = await createGroupCode();

    const res = await request(app)
      .post('/api/v1/registrations')
      .send({
        ...groupCodeAttendee,
        registrationMode: 'group',
        groupAttendees: [
          { fullName: 'Attendee A', email: 'a@example.com' },
          { fullName: 'Attendee B', email: 'b@example.com' },
        ], // 1 (self) + 2 = 3 total, below the 5-attendee minimum
        accessCode: code.code,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ACCESS_CODE_REQUIRES_GROUP');
  });

  it('accepts the code on a group of exactly 5 total attendees and applies the discount', async () => {
    const code = await createGroupCode();

    const res = await request(app)
      .post('/api/v1/registrations')
      .send({
        ...groupCodeAttendee,
        registrationMode: 'group',
        groupAttendees: [
          { fullName: 'Attendee A', email: 'a@example.com' },
          { fullName: 'Attendee B', email: 'b@example.com' },
          { fullName: 'Attendee C', email: 'c@example.com' },
          { fullName: 'Attendee D', email: 'd@example.com' }, // 1 (self) + 4 = 5 total
        ],
        accessCode: code.code,
      });

    expect(res.status).toBe(201);

    const reg = await Registration.findOne({ email: groupCodeAttendee.email });
    expect(reg?.discountPercent).toBe(10);

    const usedCode = await AccessCode.findById(code.id);
    expect(usedCode?.status).toBe('used');
  });
});

describe('POST /api/v1/admin/registrations/wai-health-invite/send — re-runnable campaign', () => {
  useTestDb();

  it('sends only to confirmed registrations not yet invited, then skips them on a re-click', async () => {
    const admin = await seedAndLoginAdmin('super_admin', 'wai-invite-test-1@test.local');

    const confirmedNotYetInvited = await Registration.create({
      type: 'attendee',
      ticketCategory: 'nigerian_professional',
      fullName: 'Not Yet Invited',
      email: 'wai-not-invited@example.com',
      phone: '+2348000001001',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'confirmed',
    });
    const alreadyInvited = await Registration.create({
      type: 'attendee',
      ticketCategory: 'nigerian_professional',
      fullName: 'Already Invited',
      email: 'wai-already-invited@example.com',
      phone: '+2348000001002',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'confirmed',
      waiHealthInviteSentAt: new Date(),
    });
    const stillPending = await Registration.create({
      type: 'attendee',
      ticketCategory: 'nigerian_professional',
      fullName: 'Still Pending',
      email: 'wai-pending@example.com',
      phone: '+2348000001003',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'pending',
    });
    const confirmedTeamMember = await Registration.create({
      type: 'team',
      fullName: 'Confirmed Organizer',
      email: 'wai-team@example.com',
      phone: '+2348000001004',
      status: 'confirmed',
    });

    const first = await admin.post('/api/v1/admin/registrations/wai-health-invite/send');
    expect(first.status).toBe(200);
    expect(first.body.data.targeted).toBe(1);
    expect(first.body.data.sent).toBe(1);

    const updated = await Registration.findById(confirmedNotYetInvited.id);
    expect(updated?.waiHealthInviteSentAt).toBeTruthy();
    expect(await Registration.findById(alreadyInvited.id).then((r) => r?.waiHealthInviteSentAt?.getTime())).toBe(
      alreadyInvited.waiHealthInviteSentAt?.getTime()
    );
    expect(await Registration.findById(stillPending.id).then((r) => r?.waiHealthInviteSentAt)).toBeFalsy();
    // Team/organizer registrations are never targeted, confirmed or not.
    expect(await Registration.findById(confirmedTeamMember.id).then((r) => r?.waiHealthInviteSentAt)).toBeFalsy();

    // Re-click with nobody new confirmed — targets nobody this time.
    const second = await admin.post('/api/v1/admin/registrations/wai-health-invite/send');
    expect(second.status).toBe(200);
    expect(second.body.data.targeted).toBe(0);

    // A newly-confirmed registration IS picked up by the next click.
    await Registration.updateOne({ _id: stillPending.id }, { $set: { status: 'confirmed' } });
    const third = await admin.post('/api/v1/admin/registrations/wai-health-invite/send');
    expect(third.status).toBe(200);
    expect(third.body.data.targeted).toBe(1);
  });
});

describe('POST /api/v1/registrations — no fully-comped code may be redeemed against VIP', () => {
  useTestDb();

  it('rejects a 100%-scholarship code picked with ticketCategory vip', async () => {
    const code = await AccessCode.create({
      code: 'SCH-VIPTEST1',
      type: 'scholarship',
      discountPercent: 100,
      issuedTo: 'vip-scholar@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app).post('/api/v1/registrations').send({
      ...attendeePayload,
      ticketCategory: 'vip',
      email: 'vip-scholar@example.com',
      accessCode: code.code,
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('FULL_COMP_NOT_VALID_FOR_VIP');
    expect(await Registration.countDocuments({ email: 'vip-scholar@example.com' })).toBe(0);
    expect(await AccessCode.findById(code.id).then((c) => c?.status)).toBe('unused');
  });

  it('still rejects a promo code picked with ticketCategory vip', async () => {
    const code = await AccessCode.create({
      code: 'PROMO-VIPTEST1',
      type: 'promo',
      issuedTo: 'promo-vip@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app).post('/api/v1/registrations').send({
      ...attendeePayload,
      ticketCategory: 'vip',
      email: 'promo-vip@example.com',
      accessCode: code.code,
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('FULL_COMP_NOT_VALID_FOR_VIP');
  });

  it('still allows a PARTIAL-discount scholarship code (not fully comped) with ticketCategory vip', async () => {
    const code = await AccessCode.create({
      code: 'SCH-VIPTEST2',
      type: 'scholarship',
      discountPercent: 50,
      issuedTo: 'vip-partial@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app).post('/api/v1/registrations').send({
      ...attendeePayload,
      ticketCategory: 'vip',
      email: 'vip-partial@example.com',
      accessCode: code.code,
    });

    expect(res.status).toBe(201);
    const reg = await Registration.findOne({ email: 'vip-partial@example.com' });
    expect(reg?.ticketCategory).toBe('vip');
    expect(reg?.discountPercent).toBe(50);
  });
});

describe('POST /api/v1/registrations — accessCodeType is copied onto the registration at redemption', () => {
  useTestDb();

  it('copies a redeemed scholarship code\'s type, classifying it into the sponsored channel', async () => {
    const code = await AccessCode.create({
      code: 'SCH-TEST01',
      type: 'scholarship',
      discountPercent: 100,
      issuedTo: 'scholar@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app).post('/api/v1/registrations').send({
      ...attendeePayload,
      ticketCategory: 'nigerian_professional',
      email: 'scholar@example.com',
      accessCode: code.code,
    });
    expect(res.status).toBe(201);

    const reg = await Registration.findById(res.body.data.id);
    expect(reg?.accessCodeType).toBe('scholarship');

    const admin = await seedAndLoginAdmin('super_admin');
    const list = await admin.get('/api/v1/admin/registrations').query({ channel: 'sponsored' });
    expect(list.status).toBe(200);
    expect(list.body.data.map((r: { email: string }) => r.email)).toContain('scholar@example.com');
    expect(list.body.data.find((r: { email: string }) => r.email === 'scholar@example.com').channel).toBe('sponsored');
  });

  it('a 100%-off promo redemption classifies into the promo channel, not sponsored', async () => {
    const code = await AccessCode.create({
      code: 'PROMO-TEST01',
      type: 'promo',
      issuedTo: 'promo-winner@example.com',
      createdBy: '000000000000000000000001',
    });

    const res = await request(app).post('/api/v1/registrations').send({
      ...attendeePayload,
      ticketCategory: 'nigerian_professional',
      email: 'promo-winner@example.com',
      accessCode: code.code,
    });
    expect(res.status).toBe(201);

    const reg = await Registration.findById(res.body.data.id);
    expect(reg?.accessCodeType).toBe('promo');
    expect(reg?.discountPercent).toBe(100);

    const admin = await seedAndLoginAdmin('super_admin');
    const sponsoredList = await admin.get('/api/v1/admin/registrations').query({ channel: 'sponsored' });
    expect(sponsoredList.body.data.map((r: { email: string }) => r.email)).not.toContain('promo-winner@example.com');

    const promoList = await admin.get('/api/v1/admin/registrations').query({ channel: 'promo' });
    expect(promoList.body.data.map((r: { email: string }) => r.email)).toContain('promo-winner@example.com');
  });

  it('a free, RSVP-confirmed registration with no code classifies into the rsvp_invited channel', async () => {
    const reg = await Registration.create({
      type: 'attendee',
      ticketCategory: 'government_official', // free category, no code
      fullName: 'Invited Official',
      email: 'invited.official@example.com',
      phone: '+2348000000099',
      country: 'Nigeria',
      registrationMode: 'individual',
      status: 'pending',
      idCardUrl: 'https://res.cloudinary.com/demo/image/upload/sample-id.jpg',
      rsvpToken: 'rsvp-test-token',
      rsvpRespondedAt: new Date(),
    });

    const admin = await seedAndLoginAdmin('super_admin');
    const list = await admin.get('/api/v1/admin/registrations').query({ channel: 'rsvp_invited' });
    expect(list.body.data.map((r: { _id: string }) => r._id)).toContain(reg.id);
    expect(list.body.data.find((r: { _id: string }) => r._id === reg.id).channel).toBe('rsvp_invited');
  });
});
