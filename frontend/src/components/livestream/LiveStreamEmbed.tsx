import { useEffect, useState } from 'react';
import { Radio, ExternalLink, CalendarClock, Mail, Loader2 } from 'lucide-react';
import { fetchLivestreamStatus, requestLivestreamAccess, type LivestreamSettings } from '../../services/livestreamSettings.service';
import { getApiErrorMessage } from '../../services/api';
import { extractYouTubeVideoId, youTubeEmbedUrl } from '../../lib/youtube';
import { DAY_DATES } from '../agenda/sessionDisplay';

// Per-browser, not per-session — once granted, a returning viewer on the same
// device isn't asked again for the rest of the Summit. This never actually
// blocks anyone from watching (see livestreamSettings.controller.ts's
// requestAccess) — it just makes sure every viewer leaves an email behind,
// matched against Registration if they're already a real attendee.
const ACCESS_STORAGE_KEY = 'ahs2026_livestream_access_email';

const AccessGate = ({ onGranted }: { onGranted: () => void }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await requestLivestreamAccess(email.trim());
      try {
        localStorage.setItem(ACCESS_STORAGE_KEY, email.trim());
      } catch {
        // Private window / blocked storage — fine, they'll just be asked
        // again next visit, access itself already succeeded.
      }
      onGranted();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't verify that email. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-navy-secondary px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange/15 text-orange">
        <Mail size={20} />
      </span>
      <p className="font-display text-base font-semibold text-white">Enter your email to watch</p>
      <p className="max-w-xs text-xs text-slate-300">We&rsquo;ll check if you&rsquo;re already registered — if not, no problem, you can still watch.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex w-full max-w-xs flex-col gap-2 sm:flex-row"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-orange/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : 'Watch now'}
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

type ActiveDay = 'day1' | 'day2' | null;

// Each day's window is a full 24h from its own midnight (Lagos time, same
// +01:00 offset DAY_DATES itself already bakes in) — not tied to any
// specific session's start/end time, since the stream may run before/after
// the published agenda (pre-show, closing remarks, etc.).
const resolveActiveDay = (now: Date): ActiveDay => {
  const day1Start = DAY_DATES.day1.getTime();
  const day2Start = DAY_DATES.day2.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const t = now.getTime();
  if (t >= day1Start && t < day1Start + dayMs) return 'day1';
  if (t >= day2Start && t < day2Start + dayMs) return 'day2';
  return null;
};

const DAY_LABEL: Record<'day1' | 'day2', string> = { day1: 'Day 1 (19 October)', day2: 'Day 2 (20 October)' };

interface LiveStreamEmbedProps {
  /** Compact: used on the homepage section — shorter empty-state copy, no heading. */
  compact?: boolean;
}

// Shared by the dedicated /live page and the homepage's "Watch Live"
// section — same data fetch, same day-resolution logic, same embed, so the
// two can never drift out of sync. `compact` only ever changes copy/spacing,
// never the underlying behavior.
export const LiveStreamEmbed = ({ compact = false }: LiveStreamEmbedProps) => {
  const [settings, setSettings] = useState<LivestreamSettings | null>(null);
  const [error, setError] = useState(false);
  const [granted, setGranted] = useState(() => {
    try {
      return Boolean(localStorage.getItem(ACCESS_STORAGE_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchLivestreamStatus()
      .then(setSettings)
      .catch(() => setError(true));
  }, []);

  if (error) return null; // a failed fetch here shouldn't break the homepage/page around it
  if (!settings) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-navy-secondary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange" />
      </div>
    );
  }

  if (!settings.isEnabled) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-navy-secondary px-6 text-center">
        <CalendarClock size={28} className="text-orange" />
        <p className="font-display text-base font-semibold text-white">Live stream details coming soon</p>
        {!compact && <p className="max-w-sm text-sm text-slate-300">Check back closer to 19&ndash;20 October 2026.</p>}
      </div>
    );
  }

  const now = new Date();
  const activeDay = resolveActiveDay(now);
  const activeUrl = activeDay ? settings[`${activeDay}Url`] : '';
  const videoId = activeUrl ? extractYouTubeVideoId(activeUrl) : null;

  if (!activeDay) {
    const isBeforeEvent = now.getTime() < DAY_DATES.day1.getTime();
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-navy-secondary px-6 text-center">
        <Radio size={28} className="text-orange" />
        <p className="font-display text-base font-semibold text-white">
          {isBeforeEvent ? "We'll be live on 19–20 October 2026" : 'Thanks for watching — the Summit has wrapped'}
        </p>
        {!compact && (
          <p className="max-w-sm text-sm text-slate-300">
            {isBeforeEvent ? 'This page goes live automatically once the Summit starts.' : 'Recordings may be shared here later.'}
          </p>
        )}
      </div>
    );
  }

  if (!activeUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-navy-secondary px-6 text-center">
        <Radio size={28} className="animate-pulse text-orange" />
        <p className="font-display text-base font-semibold text-white">{DAY_LABEL[activeDay]} stream link isn&rsquo;t set yet</p>
        {!compact && <p className="max-w-sm text-sm text-slate-300">Check back shortly — this updates automatically.</p>}
      </div>
    );
  }

  // Gate only applies once there's an actual stream to show — every
  // placeholder/waiting state above renders regardless of `granted`.
  if (!granted) {
    return <AccessGate onGranted={() => setGranted(true)} />;
  }

  if (!videoId) {
    // Not a recognized YouTube URL — still useful as a plain link-out rather
    // than a broken/blank embed.
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-navy-secondary px-6 text-center">
        <Radio size={28} className="text-orange" />
        <p className="font-display text-base font-semibold text-white">{DAY_LABEL[activeDay]} is live now</p>
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-hover"
        >
          Watch now <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
      <iframe
        src={youTubeEmbedUrl(videoId)}
        title={`AI in Health Summit 2026 — ${DAY_LABEL[activeDay]} livestream`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
