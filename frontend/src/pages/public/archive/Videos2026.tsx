import { ExternalLink } from 'lucide-react';
import { PageHero } from '../../../design-system/patterns';
import { VideoEmbed } from '../../../design-system/primitives';
import { useAlbum } from '../../../features/gallery';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { SEO } from '../../../components/seo/SEO';

// The videos live in the same Flickr collection as the photos (album
// 72177720336311834, "Highlights, short interviews" — Appendix A), so this
// reuses the same manifest pipeline rather than a separate videos system.
// Provider is 'flickr' per section 13 until the owner decides whether these
// move to YouTube.
const VIDEOS_ALBUM_ID = '72177720336311834';
const FLICKR_COLLECTION_URL = 'https://www.flickr.com/photos/aiinhealthsummit2026/collections/72157726991550631/';

export const Videos2026 = () => {
  const { photos: videos, failed, loading } = useAlbum(VIDEOS_ALBUM_ID);

  return (
    <>
      <SEO title="2026 Summit — Highlight Videos" description="Highlight videos and short interviews from the AI in Health Summit 2026." path="/2026/videos" />
      <PageHero eyebrow="AI in Health Summit 2026 Archive" title="Highlight Videos" subtitle="Short interviews and highlights from both days." />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {failed && (
            <Banner variant="error">
              We couldn&rsquo;t load the videos right now.{' '}
              <a href={FLICKR_COLLECTION_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                Browse the collection directly on Flickr <ExternalLink size={13} />
              </a>
            </Banner>
          )}

          {loading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          )}

          {videos && videos.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {videos.map((video) => (
                <VideoEmbed key={video.id} provider="flickr" videoId={video.id} posterUrl={video.largeUrl} title={video.title || 'AI in Health Summit 2026'} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
