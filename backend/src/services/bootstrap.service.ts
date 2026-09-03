import argon2 from 'argon2';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.model.js';

/**
 * Creates the initial super_admin if no users exist yet. Safe to call on every boot —
 * it's a no-op once any user exists. This is what makes the account actually reachable:
 * the in-memory dev DB (see config/db.ts) is a fresh mongod process per run, so a
 * separate one-shot seed script in its own process was landing in a different ephemeral
 * instance than the dev server. Running this in-process, in the same connection the
 * server itself uses, removes that whole class of bug for local dev.
 */
export const ensureSuperAdminSeeded = async (): Promise<void> => {
  const existingCount = await User.countDocuments();
  if (existingCount > 0) return;

  const email = env.SEED_SUPER_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await argon2.hash(env.SEED_SUPER_ADMIN_PASSWORD, { type: argon2.argon2id });
  await User.create({
    fullName: env.SEED_SUPER_ADMIN_NAME,
    email,
    passwordHash,
    role: 'super_admin',
    isActive: true,
  });

  logger.info(
    { email },
    'No users found — seeded initial super_admin from SEED_SUPER_ADMIN_* env vars. Change this password after first login.'
  );
};
