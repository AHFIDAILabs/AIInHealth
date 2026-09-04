import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Single shared picker for every profile/logo photo upload (admin settings, delegate
// portal, speakers, partners, innovations) — one endpoint per auth context reuses
// this. memoryStorage (not diskStorage) — the file never touches this server's
// disk; upload.controller.ts streams the buffer straight to Cloudinary.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      cb(new ApiError(422, 'Only JPEG, PNG, WEBP, or GIF images are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('image');

const ALLOWED_MEDIA_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime', // .mov, common straight off a phone camera
  'video/webm',
]);

// The comms team's Gallery uploader (photos and short video clips) — a separate,
// larger-ceiling picker from uploadImage above since event footage runs well past
// a 5MB profile-photo cap. memoryStorage here too; media.service.ts streams
// straight to Cloudinary the same way.
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB — comfortably covers a few minutes of 1080p phone footage
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MEDIA_MIMES.has(file.mimetype)) {
      cb(new ApiError(422, 'Only JPEG, PNG, WEBP, GIF images or MP4, MOV, WEBM videos are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('file');
