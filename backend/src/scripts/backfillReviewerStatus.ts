/**
 * scripts/backfillReviewerStatus.ts
 *
 * One-time follow-up to adding AbstractReview.reviewerStatus (accept/decline
 * an assignment before opening it — see reviewer.controller.ts's
 * respondToAssignment). submitScores now refuses anything from a reviewer
 * whose reviewerStatus isn't 'accepted' — every AbstractReview row created
 * BEFORE this feature existed defaults to 'pending' under the new schema,
 * which would suddenly lock out reviewers already mid-review under the old
 * "opening the assignment implied acceptance" assumption.
 *
 * This grandfathers in every pre-existing row as 'accepted' so nothing
 * already in flight breaks. Only ever needs to run once, right after
 * deploying the schema change; safe to run again (a no-op for any row this
 * has already touched, since it only ever moves 'pending' -> 'accepted').
 *
 * Usage:
 *   npx tsx src/scripts/backfillReviewerStatus.ts --dry-run
 *   npx tsx src/scripts/backfillReviewerStatus.ts
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { AbstractReview } from '../models/AbstractReview.model.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const dryRun = process.argv.includes('--dry-run');

async function main() {
  await connectDB();

  // A pre-existing row never had this field written at all (Mongoose only
  // applies a schema default when a document is loaded/hydrated in the app
  // layer, not retroactively in storage) — so the filter is "field absent",
  // deliberately NOT "field equals 'pending'". A genuinely new row created
  // after this feature shipped has 'pending' written explicitly at creation
  // time, and must never get swept into 'accepted' by a later re-run of this
  // script — that field-absence distinction is exactly what keeps this safe
  // to run more than once.
  const filter = { reviewerStatus: { $exists: false } };
  const count = await AbstractReview.countDocuments(filter);
  console.log(`Pre-existing AbstractReview rows with no reviewerStatus field yet: ${count}`);

  if (!dryRun && count > 0) {
    const result = await AbstractReview.updateMany(filter, { $set: { reviewerStatus: 'accepted' } });
    console.log(`Backfilled ${result.modifiedCount} row(s) to 'accepted'.`);
  } else if (dryRun) {
    console.log(`[dry-run] Would backfill ${count} row(s) to 'accepted'.`);
  }

  await disconnectDB();
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Reviewer status backfill failed');
    process.exit(1);
  });
}
