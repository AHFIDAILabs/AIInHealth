import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb, seedAndLoginAdmin } from './helpers.js';

describe('Admin auth + RBAC', () => {
  useTestDb();

  it('rejects a login with the wrong password', async () => {
    await seedAndLoginAdmin('super_admin', 'wrongpw@test.local');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrongpw@test.local', password: 'definitely-not-the-password' });
    expect(res.status).toBe(401);
  });

  it('rejects any request to an admin route with no session at all', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('lets a logged-in admin reach the dashboard', async () => {
    const admin = await seedAndLoginAdmin('super_admin');
    const res = await admin.get('/api/v1/admin/dashboard');
    expect(res.status).toBe(200);
  });

  it('blocks a viewer from a super_admin-only route (Users)', async () => {
    const viewer = await seedAndLoginAdmin('viewer');
    const res = await viewer.get('/api/v1/admin/users');
    expect(res.status).toBe(403);
  });

  it('a content_editor CAN reach volunteer registrations (the App.tsx route-guard fix)', async () => {
    const editor = await seedAndLoginAdmin('content_editor');
    const res = await editor.get('/api/v1/admin/registrations');
    expect(res.status).toBe(200);
  });
});
