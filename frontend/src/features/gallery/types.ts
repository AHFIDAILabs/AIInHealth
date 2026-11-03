// Shapes written by backend/scripts/build-media-manifest.ts into
// frontend/public/media/2026/ — see that script for the exact fields.
export interface RawAlbumIndexEntry {
  id: string;
  title: string;
  day: string | null;
  photoCount: number;
  coverPhotoUrl: string | null;
  flickrUrl: string;
}

export interface RawPhotoEntry {
  id: string;
  title: string;
  media: 'photo' | 'video';
  width: number;
  height: number;
  srcset: { width: number; url: string }[];
  largeUrl: string;
  flickrPageUrl: string;
  // Video-only — the real playable iframe src, resolved at manifest-build
  // time via Flickr's oEmbed endpoint. See VideoEmbed.tsx's own comment on
  // why this replaced a guessed URL that played as a black box.
  embedUrl?: string;
}

// What the UI actually renders — the raw manifest entry merged with
// content/2026/album-overrides.ts's display title + day grouping. See
// mergeAlbumOverride() in services/mediaManifest.service.ts.
export interface Album {
  id: string;
  title: string;
  day: 'day1' | 'day2' | 'special';
  dayInferred: boolean;
  photoCount: number;
  coverPhotoUrl: string | null;
  flickrUrl: string;
}
