import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { publicApiUrl } from '../config/env.js';

// Shared by every profile/logo photo picker (admin settings, delegate portal,
// speakers, partners, innovations) — mounted separately under /admin and /delegate
// so each keeps its own auth, but both just hand back a URL for the caller to save
// wherever they already store one (User.avatarUrl, Registration.avatarUrl, etc).
export const uploadImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(422, 'No image was uploaded.', 'NO_FILE');
  }
  res.status(201).json(new ApiResponse({ url: `${publicApiUrl}/uploads/${req.file.filename}` }));
});
