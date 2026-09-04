import { useEffect, useState } from 'react';
import { PlayCircle, ArrowRight } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { GalleryModal } from '../ui/GalleryModal';
import { listPublicMedia, type AdminMedia } from '../../services/media.service';

const PREVIEW_COUNT = 8;
// When a featured item exists, it takes a 2x2 hero slot and gets fewer neighbors
// so the strip stays at roughly the same visual weight either way.
const FEATURED_NEIGHBOR_COUNT = 4;

const Tile = ({ item, onClick, large }: { item: AdminMedia; onClick: () => void; large?: boolean }) => (
  <button
    onClick={onClick}
    className={`group block w-full overflow-hidden rounded-xl ${large ? 'col-span-2 row-span-1 aspect-video sm:row-span-2 sm:aspect-square' : 'aspect-square'}`}
  >
    <div className="relative h-full w-full">
      <img
        src={item.thumbnailUrl || item.url}
        alt={item.caption || ''}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {item.type === 'video' && (
        <span className="absolute inset-0 flex items-center justify-center bg-navy/20">
          <PlayCircle size={large ? 40 : 26} className="text-white drop-shadow" />
        </span>
      )}
    </div>
  </button>
);

// Auto-appears the moment the comms team publishes their first Gallery item —
// backed by the real published-only GET /media, same "hide until real data
// exists" pattern as ConvenedWith for partners and ConfirmedVoices for speakers.
// GET /media sorts featured items first, so preview[0] is the hero candidate.
export const MediaHighlights = () => {
  const [media, setMedia] = useState<AdminMedia[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    listPublicMedia()
      .then(setMedia)
      .catch(() => setMedia([]));
  }, []);

  if (media.length === 0) return null;

  const hasHero = media[0].isFeatured;
  const preview = media.slice(0, hasHero ? FEATURED_NEIGHBOR_COUNT + 1 : PREVIEW_COUNT);
  const hero = hasHero ? preview[0] : null;
  const rest = hasHero ? preview.slice(1) : preview;

  return (
    <section className="border-t border-slate-100 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">From the Summit</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Moments &amp; Highlights</h2>
          </div>
          <ButtonLink to="/gallery" variant="secondary" className="!border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5 !px-4 !py-2 !text-sm">
            View Full Gallery <ArrowRight size={14} className="ml-1.5" />
          </ButtonLink>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {hero && (
            <Reveal delay={0}>
              <Tile item={hero} large onClick={() => setActiveIndex(0)} />
            </Reveal>
          )}
          {rest.map((item, i) => (
            <Reveal key={item._id} delay={Math.min((i + 1) * 0.05, 0.35)}>
              <Tile item={item} onClick={() => setActiveIndex(i + (hero ? 1 : 0))} />
            </Reveal>
          ))}
        </div>
      </div>

      <GalleryModal items={preview} activeIndex={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />
    </section>
  );
};
