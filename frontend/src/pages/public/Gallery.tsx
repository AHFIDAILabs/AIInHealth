import { useEffect, useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Skeleton } from '../../components/ui/Skeleton';
import { GalleryModal } from '../../components/ui/GalleryModal';
import { listPublicMedia, type AdminMedia, type MediaType, type MediaDay } from '../../services/media.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const TABS: { label: string; value: MediaType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Photos', value: 'photo' },
  { label: 'Videos', value: 'video' },
];

const DAY_TABS: { label: string; value: MediaDay | 'all' }[] = [
  { label: 'All Moments', value: 'all' },
  { label: 'Day 1', value: 'day1' },
  { label: 'Day 2', value: 'day2' },
  { label: 'General', value: 'general' },
];

const DAY_LABEL: Record<MediaDay, string> = { day1: 'Day 1', day2: 'Day 2', general: 'General' };

export const Gallery = () => {
  useDocumentTitle('Gallery');
  const [media, setMedia] = useState<AdminMedia[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<MediaType | 'all'>('all');
  const [dayTab, setDayTab] = useState<MediaDay | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    listPublicMedia()
      .then(setMedia)
      .catch(() => setLoadError('Could not load the Gallery right now. Please try again shortly.'));
  }, []);

  const filtered = useMemo(() => {
    if (!media) return [];
    return media.filter((m) => (tab === 'all' || m.type === tab) && (dayTab === 'all' || m.day === dayTab));
  }, [media, tab, dayTab]);

  // Only offer the day filter once there's more than one day actually represented
  // in the data — a single-day gallery showing "Day 1 / Day 2 / General" pills that
  // all resolve to the same handful of photos would just be visual noise.
  const hasMultipleDays = useMemo(() => new Set((media ?? []).map((m) => m.day)).size > 1, [media]);

  const noMediaAtAll = media !== null && media.length === 0;

  return (
    <>
      <PageHero
        eyebrow="Media"
        title="Moments From the Summit"
        subtitle="Photos and video clips from AI in Health Summit 2026, posted by our team as the event unfolds."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {!noMediaAtAll && (
            <Reveal className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      tab === t.value ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {hasMultipleDays && (
                <div className="flex flex-wrap justify-center gap-2">
                  {DAY_TABS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDayTab(d.value)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        dayTab === d.value ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-500 hover:border-navy/40'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </Reveal>
          )}

          {loadError ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">{loadError}</p>
            </Reveal>
          ) : media === null ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : noMediaAtAll ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">The gallery is still empty</p>
              <p className="mt-2 text-sm text-slate-500">Photos and videos will start appearing here as the Summit approaches.</p>
            </Reveal>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">No {tab === 'photo' ? 'photos' : 'videos'} yet</p>
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item, i) => (
                <Reveal key={item._id} delay={Math.min(i * 0.04, 0.4)}>
                  <button onClick={() => setActiveIndex(i)} className="group block aspect-square w-full overflow-hidden rounded-2xl">
                    <div className="relative h-full w-full">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.caption || ''}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {item.type === 'video' && (
                        <span className="absolute inset-0 flex items-center justify-center bg-navy/20">
                          <PlayCircle size={30} className="text-white drop-shadow" />
                        </span>
                      )}
                      {(item.day !== 'general' || item.momentLabel) && (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-navy/80 to-transparent px-2.5 pb-2 pt-4 text-left text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {item.day !== 'general' ? DAY_LABEL[item.day] : ''}
                          {item.day !== 'general' && item.momentLabel ? ' · ' : ''}
                          {item.momentLabel}
                        </span>
                      )}
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <GalleryModal items={filtered} activeIndex={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />
    </>
  );
};
