// One-time import: pulls a short, hand-picked list of Flickr videos (the
// "hero intro videos" the owner selects) onto stable Cloudinary hosting, so
// the frontend can use them as a real, silently-looping <video> background —
// something Flickr itself can't support long-term, since flickr.photos.getSizes'
// video "source" URLs are signed and expire in only a few minutes (confirmed
// live against a real video ID — see this checkpoint's own notes). Re-run
// whenever the owner picks different/additional videos.
//
// Usage: npx tsx backend/scripts/import-hero-videos.ts <flickrVideoId> [<flickrVideoId> ...]
// Output: frontend/public/media/2026/hero-videos.json
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudinary, cloudinaryConfigured } from '../src/config/cloudinary.js';

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(SCRIPT_DIR, '../../frontend/public/media/2026/hero-videos.json');

interface HeroVideoEntry {
  flickrId: string;
  title: string;
  videoUrl: string;
  posterUrl: string;
}

const flickrGetSizes = async (photoId: string): Promise<{ label: string; source: string; media: string }[]> => {
  const url = `https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&api_key=${FLICKR_API_KEY}&photo_id=${photoId}&format=json&nojsoncallback=1`;
  const res = await fetch(url);
  const data = (await res.json()) as { stat: string; message?: string; sizes?: { size: { label: string; source: string; media: string }[] } };
  if (data.stat !== 'ok') throw new Error(`flickr.photos.getSizes(${photoId}): ${data.message ?? 'unknown error'}`);
  return data.sizes?.size ?? [];
};

const flickrGetTitle = async (photoId: string): Promise<string> => {
  const url = `https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=${FLICKR_API_KEY}&photo_id=${photoId}&format=json&nojsoncallback=1`;
  const res = await fetch(url);
  const data = (await res.json()) as { stat: string; photo?: { title?: { _content?: string } } };
  return data.photo?.title?._content ?? photoId;
};

// The "play/<quality>/<secret>/" page 302-redirects to the real, signed
// live.staticflickr.com/.../*.mp4 URL — short-lived, so this must be resolved
// and downloaded in the same run, never cached/stored as-is.
const resolveSignedVideoUrl = async (playPageUrl: string): Promise<string> => {
  const res = await fetch(playPageUrl, { redirect: 'manual' });
  const location = res.headers.get('location');
  if (!location) throw new Error(`No redirect from ${playPageUrl} — Flickr may have changed its video URL scheme`);
  return location;
};

const importVideo = async (flickrId: string): Promise<HeroVideoEntry> => {
  const sizes = await flickrGetSizes(flickrId);
  const videoSizes = sizes.filter((s) => s.media === 'video' && /^(1080p|720p|360p)$/.test(s.label));
  // Prefer the highest quality available, in order.
  const best = videoSizes.find((s) => s.label === '720p') ?? videoSizes.find((s) => s.label === '1080p') ?? videoSizes[0];
  if (!best) throw new Error(`No playable video size found for ${flickrId} — is this really a video photo ID?`);

  const signedMp4Url = await resolveSignedVideoUrl(best.source);
  const videoRes = await fetch(signedMp4Url);
  if (!videoRes.ok) throw new Error(`Failed to download resolved video for ${flickrId}: HTTP ${videoRes.status}`);
  const buffer = Buffer.from(await videoRes.arrayBuffer());

  const title = await flickrGetTitle(flickrId);

  const upload = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'ai-health-summit-2026/hero-videos', resource_type: 'video', public_id: `hero-${flickrId}` },
      (err, result) => (err || !result ? reject(err ?? new Error('no result')) : resolve(result))
    );
    stream.end(buffer);
  });

  return {
    flickrId,
    title,
    videoUrl: upload.secure_url,
    posterUrl: upload.secure_url.replace(/\.[a-z0-9]+$/i, '.jpg'),
  };
};

const main = async (): Promise<void> => {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('Usage: npx tsx backend/scripts/import-hero-videos.ts <flickrVideoId> [<flickrVideoId> ...]');
    process.exit(1);
  }
  if (!FLICKR_API_KEY) {
    console.error('FLICKR_API_KEY not set in backend/.env');
    process.exit(1);
  }
  if (!cloudinaryConfigured) {
    console.error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) in backend/.env');
    process.exit(1);
  }

  const entries: HeroVideoEntry[] = [];
  for (const id of ids) {
    console.log(`[import-hero-videos] ${id} — resolving + uploading...`);
    const entry = await importVideo(id);
    entries.push(entry);
    console.log(`[import-hero-videos] ${id} — done: ${entry.videoUrl}`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2));
  console.log(`[import-hero-videos] wrote ${entries.length} entries to ${OUTPUT_PATH}`);
};

main().catch((err) => {
  console.error('[import-hero-videos] failed:', err);
  process.exit(1);
});
