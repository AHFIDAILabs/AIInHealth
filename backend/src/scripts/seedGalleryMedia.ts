// Temporary placeholder Gallery content — requested explicitly so the client can
// see how the Home page's "Moments & Highlights" strip and the /gallery page
// actually look before the comms team has posted anything real (that section
// stays hidden until at least one Media doc is published, so there was nothing to
// preview otherwise).
//
// These are Abuja/venue atmosphere photos already used elsewhere on the site
// (frontend/src/assets/images) — NOT real Summit event photography — and every
// caption below says so explicitly. Delete every record this script creates
// (tagged isSeedPlaceholder: true via a caption prefix, see PLACEHOLDER_PREFIX)
// the moment the comms team uploads real photos/videos through the Gallery admin
// page. Re-running this script is a no-op for any placeholder already present.
//
// Run with: npx tsx src/scripts/seedGalleryMedia.ts
// Remove all placeholders with: npx tsx src/scripts/seedGalleryMedia.ts --clean
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageToCloudinary } from '../services/cloudinary.service.js';
import { Media } from '../models/Media.model.js';
import type { MediaDay } from '../types/enums.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'images');

export const PLACEHOLDER_PREFIX = '[Placeholder] ';

const SEED_ITEMS: { file: string; caption: string; day: MediaDay; momentLabel?: string; isFeatured?: boolean }[] = [
  {
    file: 'hero_bg.png',
    caption: `${PLACEHOLDER_PREFIX}Abuja skyline at dusk — sample image, not real Summit photography.`,
    day: 'general',
    momentLabel: 'Host City',
    isFeatured: true,
  },
  {
    file: 'Abuja_Building.jpeg',
    caption: `${PLACEHOLDER_PREFIX}Abuja architecture — sample image, not real Summit photography.`,
    day: 'day1',
    momentLabel: 'Venue',
  },
  {
    file: 'Nigerian Cultural Centre.jpg',
    caption: `${PLACEHOLDER_PREFIX}Nigerian Cultural Centre — sample image, not real Summit photography.`,
    day: 'day1',
    momentLabel: 'Opening Ceremony',
  },
  {
    file: 'ArchDatum.jpeg',
    caption: `${PLACEHOLDER_PREFIX}Conference architecture detail — sample image, not real Summit photography.`,
    day: 'day2',
    momentLabel: 'Startup Showcase',
  },
  {
    file: 'home_page_bg.png',
    caption: `${PLACEHOLDER_PREFIX}Abuja skyline — sample image, not real Summit photography.`,
    day: 'general',
    momentLabel: 'Host City',
  },
];

const clean = async () => {
  const { deletedCount } = await Media.deleteMany({ caption: { $regex: `^${PLACEHOLDER_PREFIX.trim()}` } });
  logger.info({ deletedCount }, 'Removed placeholder Gallery items');
};

const seed = async () => {
  if (!cloudinaryConfigured) {
    logger.error('CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET must be set in .env before running this seed.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  for (const item of SEED_ITEMS) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Media.findOne({ caption: item.caption });
    if (existing) {
      skipped += 1;
      continue;
    }

    const filePath = path.join(IMAGES_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      logger.warn({ file: item.file }, 'Seed image not found — skipping');
      continue;
    }
    const buffer = fs.readFileSync(filePath);
    const mimetype = item.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    // eslint-disable-next-line no-await-in-loop
    const { secureUrl } = await uploadImageToCloudinary(buffer, mimetype);

    // eslint-disable-next-line no-await-in-loop
    await Media.create({
      type: 'photo',
      caption: item.caption,
      url: secureUrl,
      thumbnailUrl: secureUrl,
      day: item.day,
      momentLabel: item.momentLabel,
      isFeatured: item.isFeatured ?? false,
      isPublished: true,
      order: 0,
    });
    created += 1;
    logger.info({ file: item.file, secureUrl }, 'Placeholder Media created');
  }

  logger.info({ created, skipped }, 'Seed complete — delete these from /admin/media the moment real event media is posted');
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    logger.error('MONGO_URI must be set — this script targets a real database, not the ephemeral dev fallback.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  logger.info('MongoDB connected');

  if (process.argv.includes('--clean')) {
    await clean();
  } else {
    await seed();
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  logger.error({ err }, 'Seed script failed');
  process.exit(1);
});
