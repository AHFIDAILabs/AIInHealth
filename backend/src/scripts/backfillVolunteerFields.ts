/**
 * scripts/backfillVolunteerFields.ts
 *
 * One-time follow-up to syncVolunteerApplications.ts. That script had no real
 * schema fields to put T-shirt size / track selection in yet, so it encoded
 * them as free-text tags (e.g. "T-Shirt: XL", "Track Selected: Guest
 * services"). Registration.model.ts now has real tshirtSize/trackSelected/
 * trackAssigned fields — this script parses those tags back out into the
 * real fields and removes the now-redundant tags, for every volunteer
 * registration that still has them encoded that way.
 *
 * Safe to run again: a row with no matching tags left is simply skipped.
 *
 * Usage:
 *   npx tsx src/scripts/backfillVolunteerFields.ts --dry-run
 *   npx tsx src/scripts/backfillVolunteerFields.ts
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const dryRun = process.argv.includes('--dry-run');

const TAG_PATTERNS: Array<{ prefix: string; field: 'tshirtSize' | 'trackSelected' | 'trackAssigned' }> = [
  { prefix: 'T-Shirt: ', field: 'tshirtSize' },
  { prefix: 'Track Selected: ', field: 'trackSelected' },
  { prefix: 'Track Assigned: ', field: 'trackAssigned' },
];

async function main() {
  await connectDB();

  const candidates = await Registration.find({ type: 'volunteer', tags: { $exists: true, $ne: [] } });
  console.log(`Volunteer registrations with tags: ${candidates.length}`);

  let updated = 0;
  for (const reg of candidates) {
    const remainingTags: string[] = [];
    const fieldUpdates: Partial<Record<'tshirtSize' | 'trackSelected' | 'trackAssigned', string>> = {};

    for (const tag of reg.tags ?? []) {
      const match = TAG_PATTERNS.find((p) => tag.startsWith(p.prefix));
      if (match) {
        fieldUpdates[match.field] = tag.slice(match.prefix.length).trim();
      } else {
        remainingTags.push(tag); // preserve any tag that isn't one of ours
      }
    }

    if (Object.keys(fieldUpdates).length === 0) continue;

    console.log(
      `${dryRun ? '[dry-run] Would update' : 'Updating'} ${reg.email}: ${JSON.stringify(fieldUpdates)}${
        remainingTags.length > 0 ? `, keeping tags: ${JSON.stringify(remainingTags)}` : ', clearing tags'
      }`
    );

    if (!dryRun) {
      Object.assign(reg, fieldUpdates);
      reg.tags = remainingTags.length > 0 ? remainingTags : undefined;
      // eslint-disable-next-line no-await-in-loop
      await reg.save();
    }
    updated += 1;
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated} / ${candidates.length}`);
  await disconnectDB();
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Volunteer field backfill failed');
    process.exit(1);
  });
}
