import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { AccessCode } from '../models/AccessCode.model.js';

const attendeePayload = {
  type: 'attendee' as const,
  registrationMode: 'individual' as const,
  ticketCategory: 'government_official' as const, // free — keeps this suite focused on registration, not payment
  fullName: 'Amina Yusuf',
  email: 'amina.yusuf@example.com',
  phone: '+2348012345678',
  country: 'Nigeria',
};

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
