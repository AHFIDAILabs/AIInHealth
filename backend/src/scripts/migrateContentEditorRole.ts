import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.model.js';

// One-off migration for the per-area staff roles refactor: 'content_editor' was
// retired (its remaining scope — Sessions/Speakers/Partners/Media/Policy
// Tracker/Newsletter/Knowledge Products/Inquiries/Messages/Translations/
// Communications — is now a strict subset of the new 'admin' role, since
// Abstract/Rapporteur/Innovation-Showcase were carved out into their own
// roles). Defaults to a dry run (prints the affected accounts, writes nothing)
// — pass --apply to perform the real update. This is the same shared
// production database every other local script in this repo points at, so
// nothing here runs for real without that explicit flag.
//
// Usage:
//   npx tsx src/scripts/migrateContentEditorRole.ts          # dry run
//   npx tsx src/scripts/migrateContentEditorRole.ts --apply  # real update

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

export const run = async (): Promise<void> => {
  await connectDB();

  const affected = await User.find({ role: 'content_editor' }).select('fullName email role').lean();

  if (affected.length === 0) {
    logger.info('No content_editor accounts found — nothing to migrate.');
    await disconnectDB();
    return;
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${affected.length} account(s) with role 'content_editor':\n`);
  for (const u of affected) {
    console.log(`  ${u.fullName} <${u.email}>`);
  }

  if (apply) {
    const res = await User.updateMany({ role: 'content_editor' }, { $set: { role: 'admin' } });
    console.log(`\nUpdated ${res.modifiedCount} account(s) to role 'admin'.`);
  } else {
    console.log('\nNo writes performed. Re-run with --apply to migrate these accounts to role \'admin\'.');
  }

  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'migrateContentEditorRole failed');
    process.exit(1);
  });
}
