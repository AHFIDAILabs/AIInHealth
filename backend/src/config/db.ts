import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env, isProd } from './env.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Fixed dbPath + port so the seed script (npm run seed) and the dev server (npm run dev)
// — separate processes — point at the SAME on-disk data instead of each spinning up its
// own throwaway empty database. Without this, a seeded admin "disappears" the moment you
// start the server, because it landed in a different ephemeral instance.
const DEV_DB_PATH = path.join(__dirname, '..', '..', '.mongo-data');
const DEV_DB_PORT = 27117;
const DEV_DB_NAME = 'ai_health_summit_dev';

let memoryServer: import('mongodb-memory-server').MongoMemoryServer | undefined;

export const connectDB = async (): Promise<void> => {
  let uri = env.MONGO_URI;

  if (!uri) {
    if (isProd) {
      // env.ts already fails boot on this in production; this is a defensive second gate.
      throw new Error('MONGO_URI is required in production');
    }
    fs.mkdirSync(DEV_DB_PATH, { recursive: true });

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: DEV_DB_NAME, port: DEV_DB_PORT, dbPath: DEV_DB_PATH, storageEngine: 'wiredTiger' },
    });
    // getUri() with no argument omits the db name, which lets mongoose fall back to an
    // implicit default that isn't guaranteed to be the same database across two separate
    // processes. Build the URI explicitly so seed/dev/debug scripts always land on the
    // same named database.
    uri = memoryServer.getUri(DEV_DB_NAME);
    logger.warn(
      { uri, dbPath: DEV_DB_PATH },
      'MONGO_URI not set — using a local dev MongoDB persisted at backend/.mongo-data. Set MONGO_URI in .env to point at a real MongoDB Atlas instance instead.'
    );
  }

  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri);
  logger.info('MongoDB connected');

  // Mongoose's default autoIndex only ever CREATES missing indexes — it never
  // reconciles one whose definition changed (e.g. a field that gained
  // `unique: true`). Against an already-populated database (this persisted dev
  // store, or any real deploy), that mismatch fails outright with
  // IndexKeySpecsConflict and the new constraint silently never takes effect.
  // syncIndexes() actually drops-and-recreates anything that no longer matches
  // its schema, so an index definition change here always takes effect on the
  // next boot instead of requiring a manual migration step. All models are
  // already registered by this point — index.ts's static `import { app }`
  // pulls in every route/controller/model before connectDB() ever runs.
  try {
    const dropped = await mongoose.connection.syncIndexes();
    if (Object.values(dropped).some((names) => names.length > 0)) {
      logger.info({ dropped }, 'MongoDB indexes synced (some rebuilt)');
    }
  } catch (err) {
    logger.error({ err }, 'MongoDB index sync failed — some constraints may be stale');
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
};
