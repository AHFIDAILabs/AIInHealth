/**
 * scripts/migrateSessionTracks.ts
 *
 * One-time follow-up to Session.track switching from a fixed string enum
 * (TRACKS, types/enums.ts) to a real Track document reference
 * (Track.model.ts) — Sessions/Agenda only, see Track.model.ts's comment for
 * why this wasn't unified across Speaker/Abstract/Innovation too.
 *
 * 1. Seeds the 6 existing TRACKS enum values as real Track documents (idempotent
 *    — matches by name, only creates what's missing), each with a distinct color.
 * 2. Migrates every Session whose `track` field is still one of those plain
 *    strings (from before this schema change) to the matching Track's ObjectId.
 *
 * Usage:
 *   npx tsx src/scripts/migrateSessionTracks.ts --dry-run
 *   npx tsx src/scripts/migrateSessionTracks.ts
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Track } from '../models/Track.model.js';
import { Session } from '../models/Session.model.js';
import { TRACKS } from '../types/enums.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const dryRun = process.argv.includes('--dry-run');

// Reuses the site's existing chart-color palette (tailwind.config.js) so
// these read as intentional, on-brand choices rather than random hex values.
const SEED_COLORS: Record<(typeof TRACKS)[number], string> = {
  'Policy & Governance': '#7C3AED',
  'Clinical AI & Diagnostics': '#0D9488',
  'Infrastructure & Data': '#2563EB',
  'Venture & Investment': '#D97706',
  'Research & Abstracts': '#E11D48',
  'Strategic Engagements': '#E8792C',
};

async function main() {
  await connectDB();

  const trackIdByName = new Map<string, string>();
  for (let i = 0; i < TRACKS.length; i += 1) {
    const name = TRACKS[i];
    const existing = await Track.findOne({ name });
    if (existing) {
      trackIdByName.set(name, existing.id);
      continue;
    }
    console.log(`${dryRun ? '[dry-run] Would create' : 'Creating'} track "${name}" (${SEED_COLORS[name]})`);
    if (!dryRun) {
      const created = await Track.create({ name, color: SEED_COLORS[name], order: i });
      trackIdByName.set(name, created.id);
    }
  }

  // Any Session whose `track` is still a plain string (pre-migration) needs
  // resolving to the matching Track's ObjectId — a raw/lean read bypasses
  // Mongoose's schema-level cast, so this sees the true stored value.
  const sessions = await Session.find().select('title track').lean();
  const toMigrate = sessions.filter((s) => typeof s.track === 'string');
  console.log(`\nSessions with a plain-string track: ${toMigrate.length}`);

  for (const s of toMigrate) {
    const trackName = s.track as unknown as string;
    const trackId = dryRun ? trackIdByName.get(trackName) ?? '(new, not yet created)' : trackIdByName.get(trackName);
    console.log(`${dryRun ? '[dry-run] Would update' : 'Updating'} "${s.title}": "${trackName}" -> ${trackId}`);
    if (!dryRun && trackId) {
      await Session.updateOne({ _id: s._id }, { $set: { track: trackId } });
    }
  }

  await disconnectDB();
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Session track migration failed');
    process.exit(1);
  });
}
