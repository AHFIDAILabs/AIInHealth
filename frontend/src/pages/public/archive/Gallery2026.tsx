import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { PageHero } from '../../../design-system/patterns';
import { AlbumGrid, useAlbumIndex } from '../../../features/gallery';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { SEO } from '../../../components/seo/SEO';
import { trackEvent } from '../../../lib/analytics';
import type { Album } from '../../../features/gallery';

const DAY_TABS: { value: Album['day'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Moments' },
  { value: 'day1', label: 'Day 1' },
  { value: 'day2', label: 'Day 2' },
  { value: 'special', label: 'Special' },
];

const FLICKR_COLLECTION_URL = 'https://www.flickr.com/photos/aiinhealthsummit2026/collections/72157726991550631/';

// Section 8.2's "Sessions in pictures" — the full archive index, grouped by
// day. Section 11's resilience requirement: if the manifest can't be
// fetched, show a clear message with a link straight to the Flickr
// collection rather than an empty, broken-looking page.
export const Gallery2026 = () => {
  const { albums, failed, loading } = useAlbumIndex();
  const [dayFilter, setDayFilter] = useState<Album['day'] | 'all'>('all');
  const navigate = useNavigate();

  const filtered = albums?.filter((a) => dayFilter === 'all' || a.day === dayFilter) ?? [];

  return (
    <>
      <SEO title="2026 Summit — Sessions in Pictures" description="Browse every session's photos from the AI in Health Summit 2026, 19–20 October 2026." path="/2026/gallery" />
      <PageHero eyebrow="AI in Health Summit 2026 Archive" title="Sessions in Pictures" subtitle="Every session, day by day. Photos: AI in Health Summit 2026 on Flickr." />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {failed && (
            <Banner variant="error">
              We couldn&rsquo;t load the photo index right now.{' '}
              <a
                href={FLICKR_COLLECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void trackEvent('outbound_flickr', { context: 'gallery_index_fallback' })}
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                Browse the collection directly on Flickr <ExternalLink size={13} />
              </a>
            </Banner>
          )}

          {!failed && (
            <>
              <div className="flex flex-wrap gap-2">
                {DAY_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setDayFilter(tab.value)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                      dayFilter === tab.value ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 text-slate-500 hover:border-orange/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-8">
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <AlbumGrid albums={filtered} onOpen={(album) => navigate(`/2026/gallery/${album.id}`)} />
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};
