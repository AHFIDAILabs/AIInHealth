import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureSuperAdminSeeded } from './services/bootstrap.service.js';
import { app } from './app.js';
import { initAdminSocket } from './sockets/adminNamespace.js';
import { startScheduledJobs } from './jobs/index.js';

const start = async (): Promise<void> => {
  await connectDB();

  // Only the ephemeral in-memory dev store auto-seeds — a real MONGO_URI (staging/
  // production) is never silently written to on boot; use `npm run seed` there instead.
  if (!env.MONGO_URI) {
    await ensureSuperAdminSeeded();
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  initAdminSocket(server);
  startScheduledJobs();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
