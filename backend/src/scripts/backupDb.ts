/**
 * scripts/backupDb.ts
 *
 * A minimal stand-in for `mongodump` for machines that don't have the MongoDB
 * Database Tools installed. Dumps every collection in whatever database
 * MONGO_URI points at (from .env — nothing is retyped into the terminal) to
 * one JSON file per collection, under backend/backups/<timestamp>/.
 *
 * Usage:
 *   npx tsx src/scripts/backupDb.ts
 *
 * This is read-only against the database — it only writes local files.
 * Restoring from it is manual (it's not a bson dump mongorestore understands):
 * each JSON file is a plain array of that collection's documents, suitable
 * for reviewing, or re-inserting via a one-off script/mongosh if it's ever
 * actually needed.
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';

async function main() {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error('No active DB connection');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), 'backups', stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const collections = await db.listCollections().toArray();
  const summary: Record<string, number> = {};

  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs, null, 2));
    summary[name] = docs.length;
  }

  await disconnectDB();

  console.log(`\nBackup written to: ${outDir}`);
  for (const [name, count] of Object.entries(summary)) {
    console.log(`  ${name}: ${count} documents`);
  }
}

main().catch((err) => {
  logger.error({ err }, 'Backup failed');
  process.exit(1);
});
