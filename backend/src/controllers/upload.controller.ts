import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageToCloudinary, uploadMediaToCloudinary } from '../services/cloudinary.service.js';

// Shared by every profile/logo photo picker (admin settings, delegate portal,
// speakers, partners, innovations) — mounted separately under /admin and /delegate
// so each keeps its own auth, but both just hand back a URL for the caller to save
// wherever they already store one (User.avatarUrl, Registration.avatarUrl, etc).
export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(422, 'No image was uploaded.', 'NO_FILE');
  }
  if (!cloudinaryConfigured) {
    // Unlike email/push's "log and no-op" dev fallback, there's no sensible fake
    // URL to hand back here — the caller needs a real, loadable image URL to save.
    throw new ApiError(503, 'Image uploads are not configured yet — set CLOUDINARY_* in .env.', 'UPLOADS_NOT_CONFIGURED');
  }

  const { secureUrl } = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
  res.status(201).json(new ApiResponse({ url: secureUrl }));
});

// The comms team's Gallery uploader — accepts a photo or a video clip and hands
// back both the hosted URL and a thumbnail (the file itself for a photo, an
// auto-derived poster frame for a video) for MediaPage to save onto a Media doc.
export const uploadMedia = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(422, 'No file was uploaded.', 'NO_FILE');
  }
  if (!cloudinaryConfigured) {
    throw new ApiError(503, 'Media uploads are not configured yet — set CLOUDINARY_* in .env.', 'UPLOADS_NOT_CONFIGURED');
  }

  const { secureUrl, thumbnailUrl, resourceType } = await uploadMediaToCloudinary(req.file.buffer, req.file.mimetype);
  res.status(201).json(
    new ApiResponse({ url: secureUrl, thumbnailUrl, type: resourceType === 'video' ? 'video' : 'photo' })
  );
});
