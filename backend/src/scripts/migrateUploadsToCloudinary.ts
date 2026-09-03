// One-time migration: uploads previously written to backend/uploads/ (local disk)
// move to Cloudinary, and every DB record pointing at the old local URL gets
// updated to the new Cloudinary secure_url. Safe to re-run — a record already
// pointing at a res.cloudinary.com URL is left untouched.
//
// Run with: npx tsx src/scripts/migrateUploadsToCloudinary.ts
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageToCloudinary } from '../services/cloudinary.service.js';
import { User } from '../models/User.model.js';
import { Registration } from '../models/Registration.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Partner } from '../models/Partner.model.js';
import { Innovation } from '../models/Innovation.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// Every model + field that could hold a locally-uploaded image URL — kept as one
// list so a new field added later just needs one more entry here, not a new script.
// `any` here is deliberate: this is a one-off ops script generically looping over
// otherwise-unrelated Mongoose models, not app logic — a shared structural type
// across five distinct schemas isn't worth fighting Mongoose's generics for.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IMAGE_FIELDS: { model: mongoose.Model<any>; field: string }[] = [
  { model: User, field: 'avatarUrl' },
  { model: Registration, field: 'avatarUrl' },
  { model: Speaker, field: 'photoUrl' },
  { model: Partner, field: 'logoUrl' },
  { model: Innovation, field: 'logoUrl' },
];

const run = async () => {
  if (!cloudinaryConfigured) {
    logger.error('CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET must be set in .env before running this migration.');
    process.exit(1);
  }
  if (!env.MONGO_URI) {
    logger.error('MONGO_URI must be set — this migration targets a real database, not the ephemeral dev fallback.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected');

  const localFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  logger.info({ count: localFiles.length, dir: UPLOADS_DIR }, 'Local files found');

  // filename -> Cloudinary secure_url, so the same local file referenced by more
  // than one record (unlikely, but possible) is only uploaded to Cloudinary once.
  const uploadedByFilename = new Map<string, string>();

  const cloudinaryUrlFor = async (filename: string): Promise<string | undefined> => {
    if (uploadedByFilename.has(filename)) return uploadedByFilename.get(filename);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      logger.warn({ filename }, 'Referenced local file no longer exists on disk — skipping');
      return undefined;
    }
    const mimetype = MIME_BY_EXT[path.extname(filename).toLowerCase()];
    if (!mimetype) {
      logger.warn({ filename }, 'Unrecognized file extension — skipping');
      return undefined;
    }
    const buffer = fs.readFileSync(filePath);
    const { secureUrl } = await uploadImageToCloudinary(buffer, mimetype);
    uploadedByFilename.set(filename, secureUrl);
    logger.info({ filename, secureUrl }, 'Uploaded to Cloudinary');
    return secureUrl;
  };

  let updatedCount = 0;
  for (const { model, field } of IMAGE_FIELDS) {
    // eslint-disable-next-line no-await-in-loop
    const docs = await model.find({ [field]: { $regex: '/uploads/' } });
    for (const doc of docs) {
      const currentUrl = (doc as unknown as Record<string, string>)[field];
      const filename = currentUrl.split('/uploads/')[1];
      if (!filename) continue;
      // eslint-disable-next-line no-await-in-loop
      const newUrl = await cloudinaryUrlFor(filename);
      if (!newUrl) continue;
      (doc as unknown as Record<string, string>)[field] = newUrl;
      // eslint-disable-next-line no-await-in-loop
      await doc.save();
      updatedCount += 1;
      logger.info({ model: model.modelName, id: doc.id, field, newUrl }, 'Record updated');
    }
  }

  logger.info({ filesUploaded: uploadedByFilename.size, recordsUpdated: updatedCount }, 'Migration complete');
  await mongoose.disconnect();
};

run().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
