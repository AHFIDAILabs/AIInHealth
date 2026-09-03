import { describe, it, expect } from 'vitest';
import { useTestDb, seedAndLoginAdmin } from './helpers.js';
import { Registration } from '../models/Registration.model.js';

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
