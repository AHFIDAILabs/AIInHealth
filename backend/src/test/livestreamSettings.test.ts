import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb, seedAndLoginAdmin } from './helpers.js';
import { LivestreamSettings } from '../models/LivestreamSettings.model.js';

describe('Livestream settings', () => {
  useTestDb();

  it('GET /livestream/status is public and defaults to disabled with empty urls', async () => {
    const res = await request(app).get('/api/v1/livestream/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ isEnabled: false, day1Url: '', day2Url: '' });
  });

  it('an admin can set the day URLs and enable it, and the public status reflects it', async () => {
    const admin = await seedAndLoginAdmin('admin');

    const setRes = await admin.put('/api/v1/admin/livestream-settings').send({
      isEnabled: true,
      day1Url: 'https://www.youtube.com/watch?v=abc123',
      day2Url: 'https://youtu.be/def456',
    });
    expect(setRes.status).toBe(200);
    expect(setRes.body.data).toEqual({
      isEnabled: true,
      day1Url: 'https://www.youtube.com/watch?v=abc123',
      day2Url: 'https://youtu.be/def456',
    });

    const publicRes = await request(app).get('/api/v1/livestream/status');
    expect(publicRes.body.data.isEnabled).toBe(true);
    expect(publicRes.body.data.day1Url).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('rejects a non-URL value for day1Url/day2Url', async () => {
    const admin = await seedAndLoginAdmin('admin');
    const res = await admin.put('/api/v1/admin/livestream-settings').send({ isEnabled: true, day1Url: 'not-a-url' });
    expect(res.status).toBe(422);
  });

  it('allows clearing a day url back to empty', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await admin.put('/api/v1/admin/livestream-settings').send({ isEnabled: true, day1Url: 'https://www.youtube.com/watch?v=abc123' });
    const res = await admin.put('/api/v1/admin/livestream-settings').send({ isEnabled: true, day1Url: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.day1Url).toBe('');
  });

  it('a registrations_officer (wrong role) cannot read or write livestream settings', async () => {
    const officer = await seedAndLoginAdmin('registrations_officer');
    const getRes = await officer.get('/api/v1/admin/livestream-settings');
    expect(getRes.status).toBe(403);
    const putRes = await officer.put('/api/v1/admin/livestream-settings').send({ isEnabled: true });
    expect(putRes.status).toBe(403);
  });

  it('getOrCreateLivestreamSettings never creates a second singleton document', async () => {
    const admin = await seedAndLoginAdmin('admin');
    await admin.get('/api/v1/admin/livestream-settings');
    await request(app).get('/api/v1/livestream/status');
    await admin.put('/api/v1/admin/livestream-settings').send({ isEnabled: true });
    const count = await LivestreamSettings.countDocuments();
    expect(count).toBe(1);
  });
});
