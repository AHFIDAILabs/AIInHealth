import { cloudinary } from '../config/cloudinary.js';

// One shared Cloudinary folder for every profile/logo photo in the app (admin
// settings, delegate portal, speakers, partners, innovations) — mirrors
// upload.controller.ts being the single shared endpoint behind all of them.
const FOLDER = 'ai-health-summit-2026';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

// A data-URI upload rather than a stream — multer hands this a Buffer already held
// in memory (see upload.middleware.ts's memoryStorage), and images are capped at
// 5MB, well within range for base64 encoding overhead to be a non-issue. Keeps the
// whole multer -> Cloudinary hop in memory, no temp file ever touches disk.
export const uploadImageToCloudinary = async (buffer: Buffer, mimetype: string): Promise<CloudinaryUploadResult> => {
  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: FOLDER,
    resource_type: 'image',
  });
  return { secureUrl: result.secure_url, publicId: result.public_id };
};

// Not wired into any route yet (no "remove photo" UI exists) — available for the
// migration script's own cleanup and for whenever that feature gets built.
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};
