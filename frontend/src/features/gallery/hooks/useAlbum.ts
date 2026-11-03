import { useEffect, useState } from 'react';
import { fetchAlbumPhotos } from '../services/mediaManifest.service';
import type { RawPhotoEntry } from '../types';

export const useAlbum = (albumId: string | null) => {
  const [photos, setPhotos] = useState<RawPhotoEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    setPhotos(null);
    setFailed(false);
    let cancelled = false;
    fetchAlbumPhotos(albumId).then((result) => {
      if (cancelled) return;
      if (result === null) setFailed(true);
      else setPhotos(result);
    });
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  return { photos, failed, loading: albumId !== null && photos === null && !failed };
};
