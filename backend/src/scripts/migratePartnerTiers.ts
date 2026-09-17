/**
 * scripts/migratePartnerTiers.ts
 *
 * One-time follow-up to the Category → Package/Tier rework of the Partners
 * section (Partner.category was removed; the public Partners page now groups
 * logos strictly by each partner's assigned SponsorshipPackage/tierOrder —
 * see PartnersShowcase.tsx and partner.controller.ts's list()).
 *
 * Two things needed doing by hand in production data, so this script does
 * them safely/idempotently rather than via a one-off shell/Mongo command:
 *
 * 1. Normalizes the three tier packages to the exact names/order requested
 *    (Title Partners / Technical Partners / Supporting Partners, tierOrder
 *    1/2/3) — creating any that don't exist yet. Matches by tierOrder, not
 *    name, so it also fixes the "Techinical Partners" typo already live.
 * 2. Every currently-published Partner with NO package assigned would
 *    otherwise silently vanish from the public page the moment this ships
 *    (package is now the only thing that puts a partner under a heading).
 *    Rather than let that happen, this defaults every such partner to the
 *    lowest tier (Supporting Partners) — visible, not lost — so an admin can
 *    promote the right ones to Title/Technical afterward via the Sponsors tab.
 *    Partners that already have a package are left untouched.
 *
 * Usage:
 *   npx tsx src/scripts/migratePartnerTiers.ts --dry-run
 *   npx tsx src/scripts/migratePartnerTiers.ts
 */
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { SponsorshipPackage } from '../models/SponsorshipPackage.model.js';
import { Partner } from '../models/Partner.model.js';

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const dryRun = process.argv.includes('--dry-run');

const TIERS = [
  { tierOrder: 1, name: 'Title Partners' },
  { tierOrder: 2, name: 'Technical Partners' },
  { tierOrder: 3, name: 'Supporting Partners' },
];

async function main() {
  await connectDB();

  const tierIdByOrder = new Map<number, string>();
  for (const tier of TIERS) {
    const existing = await SponsorshipPackage.findOne({ tierOrder: tier.tierOrder });
    if (!existing) {
      console.log(`${dryRun ? '[dry-run] Would create' : 'Creating'} package "${tier.name}" (tierOrder ${tier.tierOrder})`);
      if (!dryRun) {
        const created = await SponsorshipPackage.create({ name: tier.name, price: 0, tierOrder: tier.tierOrder });
        tierIdByOrder.set(tier.tierOrder, created.id);
      }
      continue;
    }
    tierIdByOrder.set(tier.tierOrder, existing.id);
    if (existing.name !== tier.name) {
      console.log(`${dryRun ? '[dry-run] Would rename' : 'Renaming'} "${existing.name}" -> "${tier.name}" (tierOrder ${tier.tierOrder})`);
      if (!dryRun) {
        existing.name = tier.name;
        await existing.save();
      }
    }
  }

  const supportingId = dryRun
    ? (await SponsorshipPackage.findOne({ tierOrder: 3 }))?.id
    : tierIdByOrder.get(3);

  const unpackaged = await Partner.find({ isPublished: true, package: { $exists: false } }).select('name');
  console.log(`\nPublished partners with no package assigned: ${unpackaged.length}`);
  for (const p of unpackaged) {
    console.log(`  - ${p.name}${dryRun ? ' (would assign: Supporting Partners)' : ''}`);
  }
  if (!dryRun && unpackaged.length > 0 && supportingId) {
    await Partner.updateMany({ _id: { $in: unpackaged.map((p) => p.id) } }, { $set: { package: supportingId } });
    console.log(`Assigned Supporting Partners to ${unpackaged.length} partner(s).`);
  }

  await disconnectDB();
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Partner tier migration failed');
    process.exit(1);
  });
}
