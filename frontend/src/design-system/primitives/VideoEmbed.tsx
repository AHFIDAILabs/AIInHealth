import { useState } from 'react';
import { Play } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

export type VideoProvider = 'flickr' | 'youtube';

interface VideoEmbedProps {
  provider: VideoProvider;
  videoId: string;
  // Flickr-only — the real embed src resolved via Flickr's oEmbed endpoint
  // at manifest-build time (build-media-manifest.ts). Required in practice
  // for 'flickr': the previous guessed URL shape (`/photos/<user>/<id>/
  // player/`) was confirmed to play as a black box once real video IDs
  // existed to test against.
  embedSrc?: string;
  posterUrl: string;
  title: string;
  className?: string;
}

const resolveEmbedSrc = (provider: VideoProvider, videoId: string, embedSrc?: string): string => {
  if (provider === 'youtube') {
    // youtube-nocookie.com per section 6.3 — no tracking cookie until the
    // viewer actually presses play, which is also when this iframe mounts.
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  }
  return embedSrc ?? `https://www.flickr.com/photos/aiinhealthsummit2026/${videoId}/player/`;
};

// Section 6.3's facade pattern — a poster image and a play button are all
// that render until tapped, so a page with several videos costs nothing in
// data or autoplay noise until the viewer actually wants one. One component,
// two providers, so the hosting choice (stay on Flickr vs. move to YouTube —
// section 13 asks the owner to decide) can change later without touching
// any page that uses this.
export const VideoEmbed = ({ provider, videoId, embedSrc, posterUrl, title, className = '' }: VideoEmbedProps) => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl bg-black ${className}`}>
        <iframe
          src={resolveEmbedSrc(provider, videoId, embedSrc)}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void trackEvent('video_play', { provider, videoId, title });
        setPlaying(true);
      }}
      className={`group relative block aspect-video w-full overflow-hidden rounded-xl bg-black ${className}`}
      aria-label={`Play video: ${title}`}
    >
      <img src={posterUrl} alt="" aria-hidden="true" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center bg-navy/20 transition-colors group-hover:bg-navy/30">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg transition-transform group-hover:scale-105">
          <Play size={26} className="ml-1 fill-navy" />
        </span>
      </span>
      <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm font-medium text-white">{title}</span>
    </button>
  );
};
