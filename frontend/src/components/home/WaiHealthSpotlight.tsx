import { useEffect, useMemo, useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { useAlbum } from '../../features/gallery';
import wia1 from '../../assets/images/WIA.webp';
import wia2 from '../../assets/images/WIA1.webp';
import wia3 from '../../assets/images/WIA2.webp';

// Fallback for callers that don't pass backgroundAlbumId (HomeMain.tsx's
// retired, unrouted usage) — kept exactly as it was so that archived page's
// behaviour never changes. Real callers should pass backgroundAlbumId
// instead, for real photos from the actual event.
const FALLBACK_BACKGROUND_IMAGES: string[] = [wia1, wia2, wia3];

const ROTATE_MS = 6000;

interface WaiHealthSpotlightProps {
  // Overridable for the post-event homepage (HomeRecap.tsx), where
  // "Register for the Breakfast" no longer makes sense — defaults preserve
  // the original pre-event behaviour for HomeMain.tsx exactly as it was.
  ctaTo?: string;
  ctaLabel?: string;
  // When provided, the background crossfade pulls real photos from this
  // Flickr album instead of the static fallback set above.
  backgroundAlbumId?: string;
}

// A dedicated homepage spotlight for the Women in AI & Health Breakfast, per
// the concept brief: this opens Day 1 ahead of the main programme and depends
// on real visibility to fill the room, so it gets its own section rather than
// only showing up as one more row inside SummitProgramme's generic session
// list. Static copy (not live session data) since this needs to be promotable
// before the real Session entry even exists in the admin panel.
export const WaiHealthSpotlight = ({ ctaTo = '/wai-health-breakfast', ctaLabel, backgroundAlbumId }: WaiHealthSpotlightProps) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const { photos } = useAlbum(backgroundAlbumId ?? null);

  const backgroundImages = useMemo(
    () => (backgroundAlbumId ? (photos ?? []).slice(0, 6).map((p) => p.largeUrl) : FALLBACK_BACKGROUND_IMAGES),
    [backgroundAlbumId, photos]
  );

  useEffect(() => {
    setActiveIndex(0);
    if (backgroundImages.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % backgroundImages.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [backgroundImages]);

  return (
    <section className="relative overflow-hidden bg-navy py-16">
      {backgroundImages.length > 0 && (
        <div className="absolute inset-0">
          {backgroundImages.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Keeps white text legible over any photo while still letting it read through. */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/75 to-navy/90" />
        </div>
      )}

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center sm:p-12">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange/15 text-orange">
            <Users size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange">
              {t('home.waiHealth.eyebrow', 'Day 1 · 08:00–09:00 · Opens the Summit')}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              {t('home.waiHealth.title', 'Women in AI & Health Breakfast')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t(
                'home.waiHealth.body',
                "A working breakfast for women leaders in AI and health, positioning women's priorities at the very opening of the Summit and feeding directly into the tracks and the closing declaration. Reserved for women leaders across health, technology, research, and innovation."
              )}
            </p>
          </div>
          <ButtonLink to={ctaTo} variant="primary">
            {ctaLabel ?? t('home.waiHealth.cta', 'Register for the Breakfast')} <ArrowRight size={16} />
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
};
