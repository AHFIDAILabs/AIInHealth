/**
 * scripts/migrateSessionTrackToTracks.ts
 *
 * One-time follow-up to Session.track (a single optional Track ObjectId)
 * becoming Session.tracks (an array of Track ObjectIds) — see
 * Session.model.ts's comment. Real sessions span more than one track, so the
 * admin create/edit form now offers a multi-select instead of a single
 * dropdown.
 *
 * For every existing session: wraps a set `track` into a one-element
 * `tracks` array, or sets `tracks: []` if `track` was unset — either way
 * `$unset`s the old `track` field so nothing is left under the old name.
 *
 * Defaults to a dry run (prints what would change, writes nothing) — pass
 * --apply to perform the real update.
 *
 * Usage:
 *   npx tsx src/scripts/migrateSessionTrackToTracks.ts          # dry run
 *   npx tsx src/scripts/migrateSessionTrackToTracks.ts --apply  # real update
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Session } from '../models/Session.model.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

export const run = async (): Promise<void> => {
  await connectDB();

  // Raw/lean read bypasses Mongoose's schema-level cast (the schema already
  // declares `tracks`, not `track`), so this sees the true stored value on
  // documents written before this change.
  const sessions = await Session.find().select('title track tracks').lean();
  const toMigrate = sessions.filter((s) => !Array.isArray((s as Record<string, unknown>).tracks));

  if (toMigrate.length === 0) {
    logger.info('No sessions still on the old single `track` field — nothing to migrate.');
    await disconnectDB();
    return;
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${toMigrate.length} session(s) to migrate:\n`);
  for (const s of toMigrate) {
    const oldTrack = (s as Record<string, unknown>).track as string | undefined;
    console.log(`  "${s.title}" — track: ${oldTrack ?? '(none)'} -> tracks: [${oldTrack ? oldTrack : ''}]`);
  }

  if (apply) {
    let updated = 0;
    for (const s of toMigrate) {
      const oldTrack = (s as Record<string, unknown>).track as string | undefined;
      // eslint-disable-next-line no-await-in-loop
      await Session.updateOne(
        { _id: s._id },
        { $set: { tracks: oldTrack ? [oldTrack] : [] }, $unset: { track: 1 } }
      );
      updated += 1;
    }
    console.log(`\nMigrated ${updated} session(s).`);
  } else {
    console.log('\nNo writes performed. Re-run with --apply to migrate these sessions.');
  }

  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'migrateSessionTrackToTracks failed');
    process.exit(1);
  });
}
