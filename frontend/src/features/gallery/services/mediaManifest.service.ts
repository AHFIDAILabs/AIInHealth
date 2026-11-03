import { ALBUM_OVERRIDES } from '../../../content/2026/album-overrides';
import type { Album, RawAlbumIndexEntry, RawPhotoEntry } from '../types';

const MANIFEST_BASE = '/media/2026';

// Static files served straight from public/ — no API call, no auth, loads
// with a plain fetch. A missing/unreachable file resolves to `null` rather
// than throwing, so callers can render section 11's resilience message
// ("Flickr unreachable — browse the collection directly") instead of a
// broken page.
const fetchJson = async <T>(path: string): Promise<T | null> => {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

const mergeOverride = (entry: RawAlbumIndexEntry): Album => {
  const override = ALBUM_OVERRIDES[entry.id];
  return {
    id: entry.id,
    title: override?.displayTitle ?? entry.title,
    day: override?.day ?? 'special',
    dayInferred: override?.dayInferred ?? false,
    photoCount: entry.photoCount,
    coverPhotoUrl: entry.coverPhotoUrl,
    flickrUrl: entry.flickrUrl,
  };
};

export const fetchAlbumIndex = async (): Promise<Album[] | null> => {
  const raw = await fetchJson<RawAlbumIndexEntry[]>(`${MANIFEST_BASE}/albums.json`);
  if (!raw) return null;
  return raw
    .map(mergeOverride)
    .filter((a) => !ALBUM_OVERRIDES[a.id]?.hidden)
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const fetchAlbumPhotos = async (albumId: string): Promise<RawPhotoEntry[] | null> => fetchJson<RawPhotoEntry[]>(`${MANIFEST_BASE}/albums/${albumId}.json`);
