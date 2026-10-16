import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { LiveStreamEmbed } from '../livestream/LiveStreamEmbed';
import { fetchLivestreamStatus } from '../../services/livestreamSettings.service';

// Hidden entirely until an admin turns the stream on (SettingsPage.tsx) —
// there's no value in a permanent "coming soon" homepage section months
// before there's an actual link to show. Once enabled, LiveStreamEmbed
// itself (shared with the dedicated /live page) handles every other state
// (before/during/after the event, link not set yet, etc.).
export const WatchLiveSection = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    fetchLivestreamStatus()
      .then((s) => setIsEnabled(s.isEnabled))
      .catch(() => setIsEnabled(false));
  }, []);

  if (!isEnabled) return null;

  return (
    <section className="bg-navy py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          {/* "Watch Live", not "Live Now" — this section is visible for the
              whole window the admin leaves it enabled, not only during the
              actual stream, so it must never claim something is live right
              now when it might just be pre-event. */}
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-orange">
            <Radio size={13} /> Watch Live
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Watch the Summit Live</h2>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <LiveStreamEmbed compact />
        </Reveal>

        <Reveal delay={0.16} className="mt-6 text-center">
          <ButtonLink to="/live" variant="secondary" className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
            Open Full Watch Page
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
};
