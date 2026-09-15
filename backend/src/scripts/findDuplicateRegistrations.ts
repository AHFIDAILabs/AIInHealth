/**
 * scripts/findDuplicateRegistrations.ts
 *
 * Read-only. Finds every (type, email) and (type, contactEmail) group with
 * more than one Registration document — i.e. every duplicate that the
 * partial unique indexes on Registration.model.ts are meant to prevent going
 * forward, but that may already exist in data written before those indexes
 * were added. Prints full documents for each group so a human can decide
 * which to keep/merge/delete; this script never writes anything itself.
 *
 * Usage:
 *   npx tsx src/scripts/findDuplicateRegistrations.ts
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { Registration } from '../models/Registration.model.js';

async function findDupes(field: 'email' | 'contactEmail') {
  const groups = await Registration.aggregate([
    { $match: { [field]: { $type: 'string' } } },
    { $group: { _id: { type: '$type', [field]: `$${field}` }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  return groups;
}

async function main() {
  await connectDB();

  const emailDupes = await findDupes('email');
  const contactEmailDupes = await findDupes('contactEmail');

  console.log(`\nDuplicate (type, email) groups: ${emailDupes.length}`);
  for (const group of emailDupes) {
    console.log(`\n--- ${group._id.type} / ${group._id.email} (${group.count} records) ---`);
    const docs = await Registration.find({ _id: { $in: group.ids } }).lean();
    for (const doc of docs) {
      console.log(
        JSON.stringify(
          {
            _id: doc._id,
            status: doc.status,
            paymentStatus: doc.paymentStatus,
            fullName: doc.fullName,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            qrToken: doc.qrToken ? '(set)' : undefined,
            checkedIn: doc.checkedIn,
            flootSync: doc.flootSync ? '(has flootSync)' : undefined,
          },
          null,
          2
        )
      );
    }
  }

  console.log(`\nDuplicate (type, contactEmail) groups: ${contactEmailDupes.length}`);
  for (const group of contactEmailDupes) {
    console.log(`\n--- ${group._id.type} / ${group._id.contactEmail} (${group.count} records) ---`);
    const docs = await Registration.find({ _id: { $in: group.ids } }).lean();
    for (const doc of docs) {
      console.log(
        JSON.stringify(
          {
            _id: doc._id,
            status: doc.status,
            companyName: doc.companyName,
            contactName: doc.contactName,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          },
          null,
          2
        )
      );
    }
  }

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
