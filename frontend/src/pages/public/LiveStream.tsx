import { CalendarDays } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { LiveStreamEmbed } from '../../components/livestream/LiveStreamEmbed';
import { SEO } from '../../components/seo/SEO';

export const LiveStream = () => (
  <>
    <SEO
      title="Watch Live"
      description="Watch the AI in Health Summit 2026 live, 19-20 October 2026 — Abuja, Nigeria."
      path="/live"
    />
    <PageHero eyebrow="Watch Live" title="AI in Health Summit 2026" subtitle="Streaming live, 19–20 October 2026 — Abuja, Nigeria." />

    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <LiveStreamEmbed />
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-slate-500">
            Can&rsquo;t watch right now? The full programme is always up to date on the Agenda page.
          </p>
          <ButtonLink to="/agenda" variant="secondary" className="!shrink-0 !border-slate-300 !bg-white !text-navy hover:!bg-offwhite">
            <CalendarDays size={15} className="mr-1.5" /> View Full Agenda
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  </>
);
