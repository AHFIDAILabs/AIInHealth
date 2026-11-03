import { ImageIcon } from 'lucide-react';
import { RemoteImage } from '../../../design-system/primitives';
import type { Album } from '../types';

interface AlbumGridProps {
  albums: Album[];
  onOpen: (album: Album) => void;
}

// Section 8.2's "Sessions in pictures" grid — a card per album. Falls back
// to a neutral placeholder tile when an album has no cover photo yet (true
// for every album until build-media-manifest.ts runs with a real
// FLICKR_API_KEY), rather than an empty space that reads as broken.
export const AlbumGrid = ({ albums, onOpen }: AlbumGridProps) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {albums.map((album) => (
      <button
        key={album.id}
        type="button"
        onClick={() => onOpen(album)}
        className="group text-left"
      >
        {album.coverPhotoUrl ? (
          <RemoteImage
            srcset={[{ width: 320, url: album.coverPhotoUrl }]}
            fallbackUrl={album.coverPhotoUrl}
            alt=""
            width={4}
            height={3}
            className="rounded-xl transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-100 text-slate-300 transition-colors group-hover:bg-slate-200">
            <ImageIcon size={28} />
          </div>
        )}
        <p className="mt-2 line-clamp-2 text-sm font-medium text-navy">{album.title}</p>
        <p className="text-xs text-slate-400">{album.photoCount} photos</p>
      </button>
    ))}
  </div>
);
