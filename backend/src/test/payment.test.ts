import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { Registration } from '../models/Registration.model.js';

const seedPaidAttendee = async () =>
  Registration.create({
    type: 'attendee',
    registrationMode: 'individual',
    ticketCategory: 'vip', // a paid category
    fullName: 'Ngozi Bello',
    email: 'ngozi.bello@example.com',
    phone: '+2348033334444',
    country: 'Nigeria',
    paymentStatus: 'unpaid',
  });

describe('POST /api/v1/payments/initialize — idempotency', () => {
  useTestDb();

  it('returns the same reference/authorizationUrl on a retried initialize within the reuse window', async () => {
    const reg = await seedPaidAttendee();

    const first = await request(app).post('/api/v1/payments/initialize').send({ registrationId: reg.id });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/v1/payments/initialize').send({ registrationId: reg.id });
    expect(second.status).toBe(200); // reused, not a new Paystack transaction
    expect(second.body.data.reference).toBe(first.body.data.reference);
    expect(second.body.data.authorizationUrl).toBe(first.body.data.authorizationUrl);

    // Only one reference was ever persisted, not overwritten with a second one.
    const updated = await Registration.findById(reg.id);
    expect(updated?.paymentReference).toBe(first.body.data.reference);
  });

  it('rejects initializing payment for an already-paid registration', async () => {
    const reg = await seedPaidAttendee();
    reg.paymentStatus = 'paid';
    await reg.save();

    const res = await request(app).post('/api/v1/payments/initialize').send({ registrationId: reg.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_PAID');
  });

  it('rejects a free ticket category — payment is not applicable', async () => {
    const reg = await Registration.create({
      type: 'attendee',
      registrationMode: 'individual',
      ticketCategory: 'government_official',
      fullName: 'Free Attendee',
      email: 'free@example.com',
      phone: '+2348011112222',
      country: 'Nigeria',
    });

    const res = await request(app).post('/api/v1/payments/initialize').send({ registrationId: reg.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_NOT_REQUIRED');
  });
});

describe('GET /api/v1/payments/verify/:reference — idempotency (mirrors webhook re-delivery)', () => {
  useTestDb();

  it('confirming the same payment twice only confirms it once, not twice', async () => {
    const reg = await seedPaidAttendee();
    const init = await request(app).post('/api/v1/payments/initialize').send({ registrationId: reg.id });
    const reference = init.body.data.reference as string;

    const first = await request(app).get(`/api/v1/payments/verify/${reference}`);
    expect(first.status).toBe(200);
    expect(first.body.data.paymentStatus).toBe('paid');

    const afterFirst = await Registration.findById(reg.id);
    const paidAtAfterFirst = afterFirst?.paidAt?.getTime();

    // Simulate Paystack retrying webhook delivery, or the frontend re-calling verify
    // on a page refresh — must not flip state again or re-fire side effects.
    const second = await request(app).get(`/api/v1/payments/verify/${reference}`);
    expect(second.status).toBe(200);
    expect(second.body.data.paymentStatus).toBe('paid');

    const afterSecond = await Registration.findById(reg.id);
    expect(afterSecond?.paidAt?.getTime()).toBe(paidAtAfterFirst); // unchanged — no re-processing
  });
});
