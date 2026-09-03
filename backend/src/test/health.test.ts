import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';

describe('GET /healthz', () => {
  useTestDb();

  it('reports ok once connected to the database', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
