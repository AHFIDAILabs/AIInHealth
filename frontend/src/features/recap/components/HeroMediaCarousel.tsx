import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface HeroMediaCarouselProps {
  photos: string[];
  intervalMs?: number;
}

// Crossfades through real 2026 event photos behind the homepage hero, with a
// slow Ken Burns zoom on whichever photo is active — sourced from the Flickr
// album manifest (not a hand-picked static set, so it can never drift from
// what's actually in the gallery). Freezes on the first photo, no rotation
// and no zoom, when the visitor has prefers-reduced-motion set, per section
// 11's quality bar. Resilience: an empty/not-yet-loaded photo list just
// renders nothing (a plain navy ground behind it) — never a broken-looking
// hero (section 11).
export const HeroMediaCarousel = ({ photos, intervalMs = 6000 }: HeroMediaCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (photos.length < 2 || reducedMotion) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs, reducedMotion]);

  if (photos.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.img
        key={photos[activeIndex]}
        src={photos[activeIndex]}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: reducedMotion ? 1 : 1.08 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 1.2, ease: 'easeInOut' },
          scale: { duration: intervalMs / 1000 + 1.2, ease: 'linear' },
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </AnimatePresence>
  );
};
