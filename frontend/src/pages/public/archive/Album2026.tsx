import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useAlbum, useAlbumIndex, AlbumLightbox } from '../../../features/gallery';
import { RemoteImage } from '../../../design-system/primitives';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { SEO } from '../../../components/seo/SEO';
import { trackEvent } from '../../../lib/analytics';

const FLICKR_COLLECTION_URL = 'https://www.flickr.com/photos/aiinhealthsummit2026/collections/72157726991550631/';

// One album's photo grid + lightbox — section 8.2's "opens an album view
// with lightbox and Flickr link-back." Section 11's resilience path: a
// missing/unreachable album file shows a message + link to Flickr, not a
// blank grid.
export const Album2026 = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const { albums } = useAlbumIndex();
  const { photos, failed, loading } = useAlbum(albumId ?? null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const album = albums?.find((a) => a.id === albumId);

  useEffect(() => {
    if (!albumId || !photos || photos.length === 0) return;
    void trackEvent('album_open', { albumId, photoCount: photos.length });
  }, [albumId, photos]);

  return (
    <>
      <SEO
        title={album?.title ?? 'Album'}
        description={`Photos from "${album?.title ?? 'this session'}" at the AI in Health Summit 2026.`}
        path={`/2026/gallery/${albumId}`}
      />

      <section className="bg-white pb-16 pt-28 sm:pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link to="/2026/gallery" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-orange">
            <ArrowLeft size={15} /> Back to Sessions in Pictures
          </Link>

          <h1 className="mt-4 font-display text-2xl font-semibold text-navy sm:text-3xl">{album?.title ?? 'Album'}</h1>
          {photos && <p className="mt-1 text-sm text-slate-500">{photos.length} photos · Photos: AI in Health Summit 2026 on Flickr</p>}

          {failed && (
            <div className="mt-8">
              <Banner variant="error">
                We couldn&rsquo;t load this album right now.{' '}
                <a
                  href={album?.flickrUrl ?? FLICKR_COLLECTION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void trackEvent('outbound_flickr', { context: 'album_fallback', albumId })}
                  className="inline-flex items-center gap-1 font-semibold underline"
                >
                  View it directly on Flickr <ExternalLink size={13} />
                </a>
              </Banner>
            </div>
          )}

          {loading && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          )}

          {photos && photos.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {photos.map((photo, i) => (
                <button key={photo.id} onClick={() => setActiveIndex(i)} className="block overflow-hidden rounded-lg">
                  <RemoteImage
                    srcset={photo.srcset.filter((s) => s.width <= 320)}
                    fallbackUrl={photo.srcset[0]?.url ?? photo.largeUrl}
                    alt={photo.title}
                    width={1}
                    height={1}
                    className="transition-transform hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {photos && <AlbumLightbox photos={photos} activeIndex={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />}
    </>
  );
};
