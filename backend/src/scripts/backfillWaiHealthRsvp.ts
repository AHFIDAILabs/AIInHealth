import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { WaiHealthRegistration } from '../models/WaiHealthRegistration.model.js';

// One-off backfill for the WAI-Health Gender/RSVP redesign — every
// registration created BEFORE this change has no `gender` (it used to be a
// boolean `confirmsWomen` attestation, now replaced) and no `rsvpToken`/
// `rsvpConfirmedAt` (seat reservation used to happen at signup, now moved to
// RSVP-click — see waiHealth.controller.ts's register()/rsvp()).
//
// These existing registrants are grandfathered in, not asked to reconfirm:
// they already hold a counted seat under the old model (WaiHealthSettings's
// confirmedCount was incremented at their signup time), so this just sets
// gender: 'female' (every pre-existing row went through the old women-only
// attestation) and rsvpConfirmedAt: their own createdAt, and mints a
// rsvpToken for consistency even though they'll never need to use it. It
// deliberately does NOT touch WaiHealthSettings.confirmedCount — those seats
// are already counted.
//
// Defaults to a dry run (prints the affected registrations, writes nothing)
// — pass --apply to perform the real update.
//
// Usage:
//   npx tsx src/scripts/backfillWaiHealthRsvp.ts          # dry run
//   npx tsx src/scripts/backfillWaiHealthRsvp.ts --apply  # real update

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

const generateRsvpToken = (): string => crypto.randomBytes(24).toString('base64url');

export const run = async (): Promise<void> => {
  await connectDB();

  const affected = await WaiHealthRegistration.find({ rsvpToken: { $exists: false } }).select('fullName email createdAt').lean();

  if (affected.length === 0) {
    logger.info('No WaiHealthRegistration rows missing rsvpToken — nothing to backfill.');
    await disconnectDB();
    return;
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${affected.length} registration(s) to backfill as gender:'female', already RSVP'd:\n`);
  for (const r of affected) {
    console.log(`  ${r.fullName} <${r.email}> — signed up ${new Date(r.createdAt).toLocaleDateString()}`);
  }

  if (apply) {
    let updated = 0;
    for (const r of affected) {
      // eslint-disable-next-line no-await-in-loop
      await WaiHealthRegistration.updateOne(
        { _id: r._id },
        { $set: { gender: 'female', rsvpToken: generateRsvpToken(), rsvpConfirmedAt: r.createdAt } }
      );
      updated += 1;
    }
    console.log(`\nBackfilled ${updated} registration(s).`);
  } else {
    console.log('\nNo writes performed. Re-run with --apply to backfill these registrations.');
  }

  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'backfillWaiHealthRsvp failed');
    process.exit(1);
  });
}
