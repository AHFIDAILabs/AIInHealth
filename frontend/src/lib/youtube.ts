// Extracts a YouTube video ID from whatever URL shape an admin happens to
// paste in (LivestreamSettingsPage/SettingsPage) — the admin shouldn't need
// to know YouTube's embed URL syntax, just paste the link from their browser
// address bar or the "Share" button. Returns null for anything unrecognized
// rather than guessing, so the caller can fall back to a plain link-out.
export const extractYouTubeVideoId = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      // /embed/VIDEO_ID, /live/VIDEO_ID, /shorts/VIDEO_ID
      const match = parsed.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)/);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
};

// Privacy-enhanced domain (no cookies until the viewer actually plays it) —
// functionally identical embed otherwise. rel=0 keeps "related videos" (when
// the stream ends) scoped to the same channel instead of YouTube's own
// recommendations.
export const youTubeEmbedUrl = (videoId: string): string => `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
