import { useEffect, useState } from 'react';
import { fetchAlbumIndex } from '../services/mediaManifest.service';
import type { Album } from '../types';

// `albums === null` means "not loaded yet"; `failed === true` means the
// fetch itself came back empty/unreachable (section 11's resilience path),
// which the UI renders as a message + a link to the Flickr collection
// rather than an empty grid that looks like there's simply nothing there.
export const useAlbumIndex = () => {
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAlbumIndex().then((result) => {
      if (cancelled) return;
      if (result === null) setFailed(true);
      else setAlbums(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { albums, failed, loading: albums === null && !failed };
};
