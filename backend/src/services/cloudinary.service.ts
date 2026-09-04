import { Readable } from 'node:stream';
import { cloudinary } from '../config/cloudinary.js';

// One shared Cloudinary folder for every profile/logo photo in the app (admin
// settings, delegate portal, speakers, partners, innovations) — mirrors
// upload.controller.ts being the single shared endpoint behind all of them.
const FOLDER = 'ai-health-summit-2026';

// Comms-team Gallery uploads (photos and video clips) get their own folder,
// separate from profile/logo photos above — keeps the two ends of the media
// library easy to tell apart directly in the Cloudinary dashboard too.
const MEDIA_FOLDER = 'ai-health-summit-2026/gallery';

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

export interface CloudinaryMediaUploadResult {
  secureUrl: string;
  thumbnailUrl: string;
  publicId: string;
  resourceType: 'image' | 'video';
}

// Gallery photos/videos go through upload_stream rather than the base64 data-URI
// approach above — video clips run well past the size where base64's ~37%
// overhead and building the whole encoded string in memory starts to matter.
export const uploadMediaToCloudinary = (buffer: Buffer, mimetype: string): Promise<CloudinaryMediaUploadResult> => {
  const resourceType: 'image' | 'video' = mimetype.startsWith('video/') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: MEDIA_FOLDER, resource_type: resourceType },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          // Cloudinary derives a JPG poster frame from a video at the same public_id —
          // just the delivery URL with the video's own extension swapped for .jpg.
          thumbnailUrl: resourceType === 'video' ? result.secure_url.replace(/\.[a-z0-9]+$/i, '.jpg') : result.secure_url,
          publicId: result.public_id,
          resourceType,
        });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};
