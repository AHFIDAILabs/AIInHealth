import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface HeroVideoEntry {
  flickrId: string;
  title: string;
  videoUrl: string;
  posterUrl: string;
}

// frontend/public/media/2026/hero-videos.json only exists once
// backend/scripts/import-hero-videos.ts has been run against the owner's
// chosen intro clips (see that script's own comment on why Flickr's video
// URLs can't be used directly — they expire in minutes). Until then this
// resolves to null and HomeRecap falls back to the photo carousel — never a
// broken-looking hero in the meantime (section 11's resilience rule).
export const useHeroVideos = (): HeroVideoEntry[] | null => {
  const [videos, setVideos] = useState<HeroVideoEntry[] | null>(null);

  useEffect(() => {
    fetch('/media/2026/hero-videos.json', { cache: 'no-cache' })
      .then((res) => (res.ok ? (res.json() as Promise<HeroVideoEntry[]>) : null))
      .then((data) => setVideos(data && data.length > 0 ? data : null))
      .catch(() => setVideos(null));
  }, []);

  return videos;
};

interface HeroVideoBackgroundProps {
  videos: HeroVideoEntry[];
}

// Cycles through a short, hand-picked set of real 2026 intro clips as a
// full-bleed hero background — advancing to the next clip on `onEnded`
// rather than a fixed timer, so each one plays out in full.
//
// Full object-cover, per direct request — every clip is portrait interview
// footage (9:16) being cropped to cover a wide landscape box, which only
// leaves roughly a quarter of the original frame's height visible. That
// sliver is centered on the frame (object-position: center), not anchored to
// the top — an earlier top-anchored attempt didn't reliably keep people in
// view. This is a best-effort default, not something verified against the
// actual footage (it can't be previewed from here) — if a particular clip
// still crops awkwardly, object-position can be tuned per clip, or to a
// specific percentage, once it's been seen live.
//
// Starts muted (autoplay-with-sound is blocked by every major browser
// regardless) with a small toggle to turn sound on. Respects
// prefers-reduced-motion by showing a static poster frame instead of
// autoplaying video at all.
export const HeroVideoBackground = ({ videos }: HeroVideoBackgroundProps) => {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [videos]);

  // Toggling the `muted` prop alone doesn't reliably update an
  // already-playing <video> in every browser — set it imperatively too,
  // and re-apply on every clip change since each one remounts a fresh element.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  const current = videos[index];

  if (reducedMotion) {
    return <img src={current.posterUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />;
  }

  return (
    <>
      <video
        key={current.videoUrl}
        ref={videoRef}
        autoPlay
        muted={muted}
        loop={videos.length === 1}
        playsInline
        poster={current.posterUrl}
        onEnded={() => setIndex((i) => (i + 1) % videos.length)}
        className="absolute inset-0 h-full w-full object-cover object-center"
      >
        <source src={current.videoUrl} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute background video' : 'Mute background video'}
        className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </>
  );
};
