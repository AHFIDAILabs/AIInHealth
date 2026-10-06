import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';

// One-off cleanup: staff have been registering through the public Attendee
// form under the 'staff' ("Organizer") ticket category — not through the
// separate, roster-matched Team registration page (type: 'team') — so the
// admin's "Team Registrations" view (filtered on type: 'team') was empty even
// though real team members were already confirmed. This migrates those
// EXISTING records' stored `type` from 'attendee' to 'team'.
//
// `ticketCategory: 'staff'` is deliberately left in place afterward — nothing
// reads ticketCategory on a type:'team' doc, and it's a useful marker of
// which path each person originally registered through.
//
// This is a one-time historical cleanup only. NEW Organizer sign-ups are
// deliberately NOT migrated going forward the same way — see
// registration.controller.ts's buildAdminFilter comment for why the admin's
// "Team" filter instead unifies both shapes dynamically at query time, which
// is what keeps future Organizer registrations visible there with no
// repeated migration ever needed.
//
// Defaults to a dry run (prints the affected registrations, writes nothing)
// — pass --apply to perform the real update. Same shared production database
// every other local script in this repo points at, so nothing here runs for
// real without that explicit flag.
//
// Usage:
//   npx tsx src/scripts/migrateOrganizerToTeam.ts          # dry run
//   npx tsx src/scripts/migrateOrganizerToTeam.ts --apply  # real update

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

const MATCH = { type: 'attendee', ticketCategory: 'staff' } as const;

export const run = async (): Promise<void> => {
  await connectDB();

  const affected = await Registration.find(MATCH).select('fullName email status createdAt').lean();

  if (affected.length === 0) {
    logger.info("No attendee + 'staff' (Organizer) registrations found — nothing to migrate.");
    await disconnectDB();
    return;
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${affected.length} registration(s) to move from attendee to team:\n`);
  for (const r of affected) {
    console.log(`  ${r.fullName} <${r.email}> — ${r.status}, registered ${new Date(r.createdAt).toLocaleDateString()}`);
  }

  if (apply) {
    const res = await Registration.updateMany(MATCH, { $set: { type: 'team' } });
    console.log(`\nUpdated ${res.modifiedCount} registration(s) to type 'team'.`);
  } else {
    console.log("\nNo writes performed. Re-run with --apply to migrate these registrations to type 'team'.");
  }

  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'migrateOrganizerToTeam failed');
    process.exit(1);
  });
}
