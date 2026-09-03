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
