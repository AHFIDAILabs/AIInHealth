import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model.js';

describe('POST /api/v1/newsletter/subscribe — idempotency', () => {
  useTestDb();

  it('subscribing the same email to the same source twice creates only one record', async () => {
    const payload = { email: 'reader@example.com', firstName: 'Reader', source: 'updates' as const };

    const first = await request(app).post('/api/v1/newsletter/subscribe').send(payload);
    const second = await request(app).post('/api/v1/newsletter/subscribe').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201); // still a friendly success, not an error
    expect(await NewsletterSubscriber.countDocuments({ email: payload.email })).toBe(1);
  });

  it('the same email CAN subscribe to two different sources — that is two distinct signals, not a duplicate', async () => {
    const email = 'both@example.com';
    await request(app).post('/api/v1/newsletter/subscribe').send({ email, firstName: 'Both', source: 'updates' });
    await request(app).post('/api/v1/newsletter/subscribe').send({ email, firstName: 'Both', source: 'concept_note' });

    expect(await NewsletterSubscriber.countDocuments({ email })).toBe(2);
  });

  it('rejects a submission where the honeypot field is filled in', async () => {
    const res = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'bot@example.com', firstName: 'Bot', source: 'updates', website: 'http://spam.example' });
    expect(res.status).toBe(422);
  });
});
