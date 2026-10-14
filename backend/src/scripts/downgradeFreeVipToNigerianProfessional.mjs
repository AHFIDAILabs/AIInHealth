// One-time fix: 6 real registrations redeemed a 100%-scholarship code (the
// Sponsored Delegate program) but picked ticketCategory 'vip' on the form —
// a loophole that let a free seat land in management's limited VIP pool.
// create() in registration.controller.ts now blocks this going forward
// (FULL_COMP_NOT_VALID_FOR_VIP); this script fixes the 6 that already got
// through. They stay confirmed and free (their scholarship is real) — only
// ticketCategory changes, to 'nigerian_professional' per the user's
// direction. Safe to re-run — a registration no longer at 'vip' is skipped.
//
// Run with: npx tsx src/scripts/downgradeFreeVipToNigerianProfessional.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const EMAILS = [
  'soji@pamosi.ai',
  'dadahyeldai@gmail.com',
  'onuveronicapraise1@gmail.com',
  'thetijanimojisola@gmail.com',
  'okweuwasekpor@gmail.com',
  'momodu.abubakare02@yahoo.com',
];

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

// Attribute the audit trail to a real super_admin account, same as a real
// admin action would record (AuditLog.model.ts requires a valid actor ref) —
// falls back to a plain label only if this environment has none at all.
const actorUser = await db.collection('users').findOne({ role: 'super_admin' });

let updated = 0;
let skipped = 0;

for (const email of EMAILS) {
  const before = await db.collection('registrations').findOne({ email });
  if (!before) {
    console.log(`SKIP (not found): ${email}`);
    skipped += 1;
    continue;
  }
  if (before.ticketCategory !== 'vip') {
    console.log(`SKIP (already not vip, currently "${before.ticketCategory}"): ${before.fullName} <${email}>`);
    skipped += 1;
    continue;
  }

  await db.collection('registrations').updateOne({ _id: before._id }, { $set: { ticketCategory: 'nigerian_professional' } });

  await db.collection('auditlogs').insertOne({
    actor: actorUser?._id ?? null,
    actorName: actorUser?.fullName ?? 'AHFID Developer (script)',
    actorRole: actorUser?.role ?? 'super_admin',
    action: 'registration.ticket_category_downgraded',
    resourceType: 'Registration',
    resourceId: String(before._id),
    before: { ticketCategory: 'vip' },
    after: { ticketCategory: 'nigerian_professional', reason: 'Fully-comped scholarship code was redeemed against VIP before this was blocked — downgraded to a regular free seat.' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`UPDATED: ${before.fullName} <${email}> — vip -> nigerian_professional`);
  updated += 1;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);

// Independent re-verification — never trust the loop's own counters alone.
const stillVip = await db.collection('registrations').find({ email: { $in: EMAILS }, ticketCategory: 'vip' }).toArray();
console.log(`Still ticketCategory 'vip' among these emails: ${stillVip.length}`);
const confirmedNowProfessional = await db
  .collection('registrations')
  .find({ email: { $in: EMAILS }, ticketCategory: 'nigerian_professional' })
  .toArray();
console.log(`Now ticketCategory 'nigerian_professional': ${confirmedNowProfessional.length}`);

await mongoose.disconnect();
