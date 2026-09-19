// Seeds the initial volunteer track/role options (the admin-managed list
// offered on the public VolunteerForm and the admin Volunteers "Track
// Selected"/"Track Assigned" dropdowns — see VolunteerTrack.model.ts).
// Upserts by name, so re-running is a no-op for any track that already
// exists; safe to run again after the admin adds more through the UI.
//
// Run with: npx tsx src/scripts/seedVolunteerTracks.ts
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { VolunteerTrack } from '../models/VolunteerTrack.model.js';
import { logger } from '../config/logger.js';

const TRACKS = [
  'Registration & Check-In',
  'VIP Protocol & Guest Services',
  'Room Mgmt & Tech/AV Support',
  'Ushers & Event Coordination',
  'Media & Communications',
  'Logistics',
];

const run = async () => {
  await connectDB();

  for (const [order, name] of TRACKS.entries()) {
    const res = await VolunteerTrack.updateOne({ name }, { $setOnInsert: { name, order } }, { upsert: true });
    logger.info({ name, created: res.upsertedCount > 0 }, res.upsertedCount > 0 ? 'created' : 'already existed');
  }

  const all = await VolunteerTrack.find().sort({ order: 1, name: 1 }).select('name order');
  logger.info({ count: all.length, tracks: all.map((t) => t.name) }, 'Volunteer tracks now in DB');

  await disconnectDB();
};

run().catch((err) => {
  logger.error({ err }, 'seedVolunteerTracks failed');
  process.exit(1);
});
