import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { ensureSuperAdminSeeded } from '../services/bootstrap.service.js';

// Manual entry point for staging/production (a real MONGO_URI) where the server
// doesn't auto-seed on boot. Local dev against the in-memory store auto-seeds itself —
// see index.ts — so this script is mostly redundant there, but harmless to run.
const run = async (): Promise<void> => {
  await connectDB();
  await ensureSuperAdminSeeded();
  logger.info({ email: env.SEED_SUPER_ADMIN_EMAIL }, 'Seed check complete.');
  await disconnectDB();
};

run().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
