import { useEffect, useState } from 'react';

interface HeroMediaCarouselProps {
  photos: string[];
  intervalMs?: number;
}

// Crossfades through real 2026 event photos behind the homepage hero — same
// proven technique as WaiHealthSpotlight's background rotation, sourced from
// the Flickr album manifest's own cover photos instead of a hand-picked
// static set, so it can never drift from what's actually in the gallery.
// Freezes on the first photo (no rotation) when the visitor has
// prefers-reduced-motion set, per section 11's quality bar. Resilience: an
// empty/not-yet-loaded photo list just renders a plain navy ground — never a
// broken-looking hero (section 11).
export const HeroMediaCarousel = ({ photos, intervalMs = 6000 }: HeroMediaCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs]);

  if (photos.length === 0) return null;

  return (
    <>
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            i === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </>
  );
};
