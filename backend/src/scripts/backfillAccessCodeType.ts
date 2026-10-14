// One-time backfill: Registration.model.ts's accessCodeType field didn't exist
// until the Registration Channels feature — every registration that redeemed
// an access code BEFORE that change has an `accessCode` string but no
// `accessCodeType`, so it can't be classified into a channel
// (registrationChannel.ts) until this runs. Safe to re-run — a registration
// that already has accessCodeType set is left untouched.
//
// Run with: npx tsx src/scripts/backfillAccessCodeType.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';
import { AccessCode } from '../models/AccessCode.model.js';

const run = async () => {
  await mongoose.connect(env.MONGO_URI);
  logger.info('Connected to MongoDB.');

  const targets = await Registration.find({
    accessCode: { $exists: true, $ne: '' },
    accessCodeType: { $exists: false },
  })
    .select('_id accessCode')
    .lean();

  logger.info(`Found ${targets.length} registration(s) with a redeemed code but no accessCodeType.`);

  let updated = 0;
  let noMatchingCode = 0;

  for (const reg of targets) {
    // eslint-disable-next-line no-await-in-loop
    const code = await AccessCode.findOne({ code: reg.accessCode }).select('type').lean();
    if (!code) {
      noMatchingCode += 1;
      logger.warn(`No AccessCode document found for code "${reg.accessCode}" (registration ${reg._id}) — skipped.`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await Registration.updateOne({ _id: reg._id }, { $set: { accessCodeType: code.type } });
    updated += 1;
  }

  logger.info(`Backfill complete: ${updated} updated, ${noMatchingCode} skipped (no matching AccessCode).`);

  // Independent re-verification — never trust this script's own counters alone.
  const stillMissing = await Registration.countDocuments({
    accessCode: { $exists: true, $ne: '' },
    accessCodeType: { $exists: false },
  });
  logger.info(`Remaining registrations with a code but no accessCodeType: ${stillMissing}.`);

  await mongoose.disconnect();
};

run().catch((err) => {
  logger.error({ err }, 'backfillAccessCodeType failed');
  process.exit(1);
});
