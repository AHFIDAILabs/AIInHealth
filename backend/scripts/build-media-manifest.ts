// Build-time Flickr manifest generator (brief section 6.1). Run manually
// whenever albums change — not called at request time, and never ships the
// API key to the browser. Output:
//   frontend/public/media/2026/albums.json           (small index, loads with the page)
//   frontend/public/media/2026/albums/<albumId>.json  (one file per album, loaded on open)
//
// Usage: npx tsx backend/scripts/build-media-manifest.ts
//
// Without FLICKR_API_KEY set, this still runs — it writes the album index
// from the known seed list (media-manifest-seed.ts, typed in from the
// brief's own Appendix A) but can't produce real per-album photo files,
// since Flickr's photo-level data (URLs, dimensions) can only come from the
// live API. The frontend's resilience path (section 11) already covers an
// album whose file 404s: a clear message + a link to the Flickr collection.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_ALBUMS } from './media-manifest-seed.js';

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const FLICKR_USER_ID = '205067440@N03'; // ahfidng — docs/AIHS-2027-platform-brief.md section 6
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(SCRIPT_DIR, '../../frontend/public/media/2026');

interface AlbumIndexEntry {
  id: string;
  title: string;
  day: string | null;
  photoCount: number;
  coverPhotoUrl: string | null;
  flickrUrl: string;
}

interface PhotoEntry {
  id: string;
  title: string;
  media: 'photo' | 'video';
  width: number;
  height: number;
  srcset: { width: number; url: string }[];
  largeUrl: string;
  flickrPageUrl: string;
  // Video-only — the real playable iframe src, resolved via Flickr's own
  // oEmbed endpoint (see fetchFlickrEmbedUrl below). The frontend previously
  // guessed this URL's shape (`/photos/<user>/<id>/player/`) since no real
  // video ID was available to verify against yet — now that real videos
  // exist in the manifest, that guess is confirmed wrong (plays as a black
  // box). oEmbed is Flickr's documented, stable contract for exactly this,
  // so there's nothing left to guess.
  embedUrl?: string;
}

// Flickr's own oEmbed endpoint — the officially documented way to get a
// working embed for any public photo/video page URL, without needing to know
// Flickr's internal embed URL scheme (which has changed over the years) or
// guess at query params/secrets.
const fetchFlickrEmbedUrl = async (flickrPageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(`https://www.flickr.com/services/oembed/?format=json&url=${encodeURIComponent(flickrPageUrl)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { html?: string };
    const match = data.html?.match(/src="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
  } catch {
    return null;
  }
};

const flickrRest = async (method: string, params: Record<string, string>): Promise<any> => {
  const url = new URL('https://api.flickr.com/services/rest/');
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', FLICKR_API_KEY as string);
  url.searchParams.set('format', 'json');
  url.searchParams.set('nojsoncallback', '1');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Flickr ${method} HTTP ${res.status}`);
  const data = (await res.json()) as { stat: string; message?: string };
  if (data.stat !== 'ok') throw new Error(`Flickr ${method} error: ${data.message ?? 'unknown'}`);
  return data;
};

// Flickr's size-suffix URL scheme (no extra API call needed per size — see
// https://www.flickr.com/services/api/misc.urls.html). We only request the
// extras we actually use for width/height/url_* at each breakpoint.
const SIZE_EXTRAS = 'url_n,url_z,url_c,url_l,o_dims'; // 320/640/800/1024-ish + original dims
const SRCSET_WIDTHS = [320, 640, 800, 1024, 1600] as const;

const buildFromApi = async (): Promise<void> => {
  const list = await flickrRest('flickr.photosets.getList', { user_id: FLICKR_USER_ID });
  const photosets = list.photosets.photoset as { id: string; title: { _content: string } }[];

  const index: AlbumIndexEntry[] = [];
  fs.mkdirSync(path.join(OUTPUT_DIR, 'albums'), { recursive: true });

  for (const set of photosets) {
    const photosRes = await flickrRest('flickr.photosets.getPhotos', {
      photoset_id: set.id,
      user_id: FLICKR_USER_ID,
      extras: `media,${SIZE_EXTRAS}`,
    });
    const photos = photosRes.photoset.photo as Record<string, string>[];

    const photoEntries: PhotoEntry[] = [];
    for (const p of photos) {
      const media = (p.media as 'photo' | 'video') ?? 'photo';
      const flickrPageUrl = `https://www.flickr.com/photos/aiinhealthsummit2026/${p.id}/`;
      photoEntries.push({
        id: p.id,
        title: p.title,
        media,
        width: Number(p.width_o ?? p.width_l ?? 0),
        height: Number(p.height_o ?? p.height_l ?? 0),
        srcset: SRCSET_WIDTHS.map((w) => ({ width: w, url: p[`url_${w <= 320 ? 'n' : w <= 640 ? 'z' : w <= 800 ? 'c' : 'l'}`] ?? p.url_l ?? '' })).filter((s) => s.url),
        largeUrl: p.url_l ?? p.url_c ?? p.url_z ?? p.url_n ?? '',
        flickrPageUrl,
        // Only videos need a real embed URL — fetched one at a time (not
        // Promise.all) to stay a polite, low-concurrency guest of Flickr's
        // API, same spirit as the rest of this script's sequential photoset loop.
        ...(media === 'video' ? { embedUrl: (await fetchFlickrEmbedUrl(flickrPageUrl)) ?? undefined } : {}),
      });
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'albums', `${set.id}.json`), JSON.stringify(photoEntries, null, 2));

    index.push({
      id: set.id,
      title: set.title._content,
      day: null, // display title/day come from content/2026/album-overrides.ts, not this raw index
      photoCount: photoEntries.length,
      coverPhotoUrl: photoEntries[0]?.srcset.find((s) => s.width === 320)?.url ?? null,
      flickrUrl: `https://www.flickr.com/photos/aiinhealthsummit2026/sets/${set.id}/`,
    });

    console.log(`[media-manifest] ${set.id} — ${photoEntries.length} items`);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'albums.json'), JSON.stringify(index, null, 2));
  console.log(`[media-manifest] wrote albums.json (${index.length} albums) + ${index.length} per-album files`);
};

const buildFromSeed = (): void => {
  fs.mkdirSync(path.join(OUTPUT_DIR, 'albums'), { recursive: true });

  const index: AlbumIndexEntry[] = SEED_ALBUMS.map((a) => ({
    id: a.id,
    title: a.rawTitle,
    day: null,
    photoCount: a.photoCount,
    coverPhotoUrl: null, // no real photo URLs without the API — see file header
    flickrUrl: `https://www.flickr.com/photos/aiinhealthsummit2026/sets/${a.id}/`,
  }));

  fs.writeFileSync(path.join(OUTPUT_DIR, 'albums.json'), JSON.stringify(index, null, 2));
  console.log(`[media-manifest] FLICKR_API_KEY not set — wrote albums.json from the seed list (${index.length} albums).`);
  console.log('[media-manifest] No per-album photo files were written. Set FLICKR_API_KEY and re-run for real photo data.');
};

const main = async (): Promise<void> => {
  if (FLICKR_API_KEY) {
    await buildFromApi();
  } else {
    buildFromSeed();
  }
};

main().catch((err) => {
  console.error('[media-manifest] failed:', err);
  process.exit(1);
});
