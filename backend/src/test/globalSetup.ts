import { MongoMemoryServer } from 'mongodb-memory-server';

// Runs once for the whole test run (Vitest's globalSetup contract), in the main
// process — not per test file — so the spawned mongod child process survives for
// every test file's duration and is torn down exactly once at the end. Fixed port
// (distinct from config/db.ts's dev-server port 27117) so setupEnv.ts can point
// MONGO_URI at it without any runtime hand-off between the two.
const TEST_DB_PORT = 27118;
export const TEST_MONGO_URI = `mongodb://127.0.0.1:${TEST_DB_PORT}/ai_health_summit_test`;

export default async function setup() {
  const server = await MongoMemoryServer.create({
    instance: { port: TEST_DB_PORT, dbName: 'ai_health_summit_test' },
  });

  return async () => {
    await server.stop();
  };
}
