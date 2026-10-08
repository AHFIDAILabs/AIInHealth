import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { WaiHealthRegistration } from '../models/WaiHealthRegistration.model.js';

// coHostNetwork just became required (jobTitle too, but every existing row
// already has one — only coHostNetwork needs this). Existing registrations
// from before this change have coHostNetwork: '' (it was optional, and the
// public form left it blank rather than omitting it) — Mongoose's default
// String required validator rejects an empty string, not just null/undefined,
// so any future .save() on one of these docs (e.g. linkRegistration(), an
// admin edit) would start failing the moment the schema's `required: true`
// takes effect, over a value that was perfectly valid when it was written.
// This backfills those existing blanks to 'None' — the same neutral answer
// the form itself now suggests for someone with no co-host network — so no
// existing registration is ever retroactively invalidated.
//
// Defaults to a dry run (prints the affected registrations, writes nothing)
// — pass --apply to perform the real update.
//
// Usage:
//   npx tsx src/scripts/backfillWaiHealthNetworkRequired.ts          # dry run
//   npx tsx src/scripts/backfillWaiHealthNetworkRequired.ts --apply  # real update

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

export const run = async (): Promise<void> => {
  await connectDB();

  const affected = await WaiHealthRegistration.find({ coHostNetwork: '' }).select('fullName email createdAt').lean();

  if (affected.length === 0) {
    logger.info("No WaiHealthRegistration rows with a blank coHostNetwork — nothing to backfill.");
    await disconnectDB();
    return;
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${affected.length} registration(s) to set coHostNetwork: 'None':\n`);
  for (const r of affected) {
    console.log(`  ${r.fullName} <${r.email}> — signed up ${new Date(r.createdAt).toLocaleDateString()}`);
  }

  if (apply) {
    const res = await WaiHealthRegistration.updateMany({ coHostNetwork: '' }, { $set: { coHostNetwork: 'None' } });
    console.log(`\nBackfilled ${res.modifiedCount} registration(s).`);
  } else {
    console.log('\nNo writes performed. Re-run with --apply to backfill these registrations.');
  }

  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'backfillWaiHealthNetworkRequired failed');
    process.exit(1);
  });
}
