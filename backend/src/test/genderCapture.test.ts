import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { Registration } from '../models/Registration.model.js';

const basePayload = {
  type: 'attendee' as const,
  registrationMode: 'individual' as const,
  ticketCategory: 'nigerian_professional' as const, // free-text, no ID-upload gate to work around
  fullName: 'Tunde Bakare',
  email: 'tunde.bakare@example.com',
  phone: '+2348012340000',
  country: 'Nigeria',
};

const loginAsDelegate = async (email: string, overrides: Record<string, unknown> = {}) => {
  await Registration.create({
    type: 'attendee',
    registrationMode: 'individual',
    ticketCategory: 'nigerian_professional',
    fullName: 'Portal Gender Tester',
    email,
    phone: '+2348099990000',
    country: 'Nigeria',
    status: 'confirmed',
    isActive: true,
    ...overrides,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/delegate/login').send({ email });
  if (res.status !== 200) throw new Error(`Delegate login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

describe('Gender capture — Attendee registration form', () => {
  useTestDb();

  it('accepts an optional gender on signup and persists it', async () => {
    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...basePayload, gender: 'female' });
    expect(res.status).toBe(201);

    const saved = await Registration.findOne({ email: basePayload.email });
    expect(saved?.gender).toBe('female');
  });

  it('registration still succeeds with no gender given at all', async () => {
    const res = await request(app).post('/api/v1/registrations').send(basePayload);
    expect(res.status).toBe(201);

    const saved = await Registration.findOne({ email: basePayload.email });
    expect(saved?.gender).toBeUndefined();
  });

  it('rejects an invalid gender value', async () => {
    const res = await request(app)
      .post('/api/v1/registrations')
      .send({ ...basePayload, gender: 'not-a-real-option' });
    expect(res.status).toBe(422);
  });
});

describe('Gender capture — delegate portal profile', () => {
  useTestDb();

  it('a delegate can self-report gender from the portal, reflected in both updateProfile and me()', async () => {
    const agent = await loginAsDelegate('portal-gender@example.com');

    const before = await agent.get('/api/v1/delegate/me');
    expect(before.body.data.gender).toBeNull();

    const updateRes = await agent.patch('/api/v1/delegate/profile').send({ gender: 'prefer_not_to_say' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.gender).toBe('prefer_not_to_say');

    const after = await agent.get('/api/v1/delegate/me');
    expect(after.body.data.gender).toBe('prefer_not_to_say');
  });

  it('updating other profile fields leaves an already-set gender untouched', async () => {
    const agent = await loginAsDelegate('portal-gender-2@example.com', { gender: 'male' });

    await agent.patch('/api/v1/delegate/profile').send({ phone: '+2348011112222' });
    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.gender).toBe('male');
  });

  it('rejects an invalid gender value from the portal too', async () => {
    const agent = await loginAsDelegate('portal-gender-3@example.com');
    const res = await agent.patch('/api/v1/delegate/profile').send({ gender: 'other' });
    expect(res.status).toBe(422);
  });
});
