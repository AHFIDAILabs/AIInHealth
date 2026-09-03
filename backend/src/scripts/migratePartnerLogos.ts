// One-time migration: the 11 real, curated institutional partner logos living as
// static image files in frontend/src/assets/images/LOGO/ (consumed by the old,
// now-removed lib/partnerLogos.ts) become real Partner records — uploaded to
// Cloudinary, published, so they're admin-manageable and show up wherever the site
// reads from the real Partner API instead of a hardcoded file list.
//
// tier/category below are a reasonable best guess per organization, not confirmed
// AHFID input — correct them in the admin Partners page if any are off; it's just
// an internal filter tag, not shown on the public logo wall itself.
//
// Also deletes the one pre-existing Partner record ("Zionnaire Concept") — test
// debris with a broken Google-Images-redirect logoUrl, not real partner data.
//
// Run with: npx tsx src/scripts/migratePartnerLogos.ts
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageToCloudinary } from '../services/cloudinary.service.js';
import { Partner } from '../models/Partner.model.js';
import type { PartnerTier, PartnerCategory } from '../types/enums.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'images', 'LOGO');

const PARTNERS: { file: string; name: string; category: PartnerCategory; website?: string }[] = [
  { file: 'CCCRN.png', name: 'CCCRN', category: 'Academia', website: 'https://cccr-nigeria.org/' },
  { file: 'Digital Health Africa.png', name: 'Digital Health Africa', category: 'Private Sector', website: 'https://digitalhealth-africa.org/' },
  { file: 'GGHN.png', name: 'GGHN', category: 'Multilateral', website: 'https://gghnigeria.org/' },
  { file: 'Heartland Alliance_.png', name: 'Heartland Alliance', category: 'Multilateral', website: 'https://heartlandalliancenigeria.org/' },
  { file: 'Vaccine Network.png', name: 'Vaccine Network', category: 'Multilateral', website: 'https://thevaccinenetwork.org/' },
  { file: 'West African Institute of Public Health.png', name: 'West African Institute of Public Health', category: 'Academia', website: 'https://www.publichealth-edu.org/' },
  { file: 'ABC Health.png', name: 'ABC Health', category: 'Private Sector' },
  { file: 'Bloom Public Health.png', name: 'Bloom Public Health', category: 'Private Sector' },
  { file: 'PSHAN.png', name: 'PSHAN', category: 'Private Sector' },
  { file: 'Policy Innovation Centre.png', name: 'Policy Innovation Centre', category: 'Academia' },
  { file: 'WCA Health.png', name: 'WCA Health', category: 'Private Sector' },
];

const TIER: PartnerTier = 'Strategic Partner';
const JUNK_RECORD_NAME = 'Zionnaire Concept';

const run = async () => {
  if (!cloudinaryConfigured) {
    logger.error('CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET must be set in .env before running this migration.');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    logger.error('MONGO_URI must be set — this migration targets a real database, not the ephemeral dev fallback.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  logger.info('MongoDB connected');

  const deletedJunk = await Partner.deleteOne({ name: JUNK_RECORD_NAME });
  logger.info({ deleted: deletedJunk.deletedCount }, `Removed test record "${JUNK_RECORD_NAME}" if present`);

  let created = 0;
  let skipped = 0;
  for (const p of PARTNERS) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Partner.findOne({ name: p.name });
    if (existing) {
      logger.info({ name: p.name }, 'Partner record already exists — skipping');
      skipped += 1;
      continue;
    }

    const filePath = path.join(LOGO_DIR, p.file);
    if (!fs.existsSync(filePath)) {
      logger.warn({ file: p.file }, 'Logo file not found — skipping');
      continue;
    }
    const buffer = fs.readFileSync(filePath);
    // eslint-disable-next-line no-await-in-loop
    const { secureUrl } = await uploadImageToCloudinary(buffer, 'image/png');

    // eslint-disable-next-line no-await-in-loop
    await Partner.create({
      name: p.name,
      tier: TIER,
      category: p.category,
      website: p.website,
      logoUrl: secureUrl,
      isPublished: true,
      order: 0,
    });
    created += 1;
    logger.info({ name: p.name, secureUrl }, 'Partner created');
  }

  logger.info({ created, skipped }, 'Migration complete');
  await mongoose.disconnect();
};

run().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
