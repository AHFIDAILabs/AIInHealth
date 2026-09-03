import argon2 from 'argon2';
import mongoose from 'mongoose';
import request from 'supertest';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { app } from '../app.js';
import { User } from '../models/User.model.js';
import type { Role } from '../types/enums.js';

// Connects once per test file and disconnects at the end; clears every collection
// after each test so tests never see leftover state from a previous one (the
// in-memory Mongo instance itself is shared and long-lived — see globalSetup.ts).
export const useTestDb = (): void => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI as string);
    }
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
};

const TEST_PASSWORD = 'Test-Password-123!';

// Creates an admin user directly (skips the real invite/set-password flow, which
// isn't what these tests are exercising) and logs in through the real endpoint —
// so tests get a real, valid session cookie the same way a browser would.
export const seedAndLoginAdmin = async (role: Role, email = `${role}@test.local`): Promise<request.Agent> => {
  const passwordHash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id });
  await User.create({ fullName: `Test ${role}`, email, passwordHash, role, isActive: true });

  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Test login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
};

export { app };
