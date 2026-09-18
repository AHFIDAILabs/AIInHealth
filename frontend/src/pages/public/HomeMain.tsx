import { motion, type Variants } from 'framer-motion';
import { CalendarDays, MapPin, Clock3, ArrowRight } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { useCountdown } from '../../hooks/useCountdown';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SpeakersGrid } from '../../components/home/SpeakersGrid';
import { SummitProgramme } from '../../components/home/SummitProgramme';
import { PartnersShowcase } from '../../components/home-v2/PartnersShowcase';
import { VENUE_SHORT } from '../../lib/siteInfo';
import heroBg from '../../assets/images/hero_bg.webp';

// Same summit start used by CountdownCard.tsx/HeroCountdown.tsx — duplicated
// rather than imported so each countdown surface can diverge later without
// one silently dragging the others along (see CountdownCard.tsx's own note).
const SUMMIT_DATE = new Date('2026-10-19T09:00:00+01:00');

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

const COUNTDOWN_UNITS = ['days', 'hours', 'minutes', 'seconds'] as const;

// The production homepage — restyled to match the look the team was given
// (dark photo hero, boxed countdown, photo-card speaker grid with a hover
// reveal, plain programme list, bigger partner logos), built from the real
// content on the live site rather than invented copy. The previous two
// homepages (Home.tsx, NewHome.tsx) are kept, just no longer linked from the
// main nav — see App.tsx's /classic and /home-v2 routes.
export const HomeMain = () => {
  useDocumentTitle('Home');
  const countdown = useCountdown(SUMMIT_DATE);

  return (
    <>
      {/* Hero — headline/subtitle/chips/CTAs centered over the photo. Their
          anniversary ribbon ("5 Years of Impact") is skipped outright — this
          is the Summit's first edition, so there's no equivalent real claim
          to put there. */}
      {/* Cancels PublicLayout's <main> padding-top (there so plain content
          pages clear the fixed nav) — this hero wants the photo to run
          full-bleed behind that transparent nav instead, all the way to the
          true viewport top. Reads the same measured --header-height so it
          exactly matches at every width, not just the ones a fixed
          breakpoint guess happened to cover. */}
      <section
        className="relative isolate flex min-h-screen flex-col overflow-hidden bg-navy"
        style={{ marginTop: 'calc(var(--header-height, 4rem) * -1)' }}
      >
        <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/40" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-14 text-center sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="show" className="flex flex-col items-center">
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="flex max-w-3xl flex-wrap items-center pt-5 justify-center gap-3 font-display text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-[3.6rem]"
            >
              Artificial Intelligence in Health Summit 2026
{/* <span className="h-6 w-6 shrink-0 rounded-sm bg-orange sm:h-8 sm:w-8" /> */}
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              className="mt-4 max-w-xl text-lg font-semibold leading-snug text-slate-100 sm:text-xl"
            >
              Harnessing Artificial Intelligence to Strengthen Health Systems and Accelerate Universal Health
              Coverage in Nigeria and Africa.
            </motion.p>

            {/* Date / Venue / Time zone bars */}
            <motion.div custom={2} variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-3 sm:gap-4">
              {[
                { icon: CalendarDays, label: 'Date', value: '19 – 20 Oct 2026' },
                { icon: MapPin, label: 'Venue', value: VENUE_SHORT },
                { icon: Clock3, label: 'Time Zone', value: 'WAT · GMT+1' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-2 rounded-tl-3xl rounded-br-3xl border border-navy/15 bg-white px-4 py-3 text-[13px] font-bold text-orange sm:text-sm"
                >
                  <item.icon size={15} className="shrink-0" />
                  <span className="font-bold uppercase tracking-wide">{item.label}:</span> {item.value}
                </span>
              ))}
            </motion.div>

            {/* Primary + secondary CTA */}
            <motion.div custom={3} variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/register" variant="primary" className="!px-7 !py-3.5 !text-[15px]">
                Apply to Attend <ArrowRight size={17} className="ml-1.5" />
              </ButtonLink>
              <ButtonLink
                to="/partners"
                variant="secondary"
                className="!border-white/30 !bg-white/10 !px-7 !py-3.5 !text-[15px] !text-white hover:!bg-white/20"
              >
                Become a Partner
              </ButtonLink>
            </motion.div>
          </motion.div>
        </div>

      </section>

      {/* Countdown */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Countdown</h2>
            <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-orange" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">Event Starts In</p>
            <div className="mx-auto mt-5 grid max-w-lg grid-cols-4 gap-3 sm:gap-4">
              {COUNTDOWN_UNITS.map((unit) => (
                <div key={unit} className="rounded-xl border border-slate-200 bg-offwhite py-5">
                  <p className="font-display text-3xl font-bold text-navy sm:text-4xl">
                    {String(countdown[unit]).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{unit}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <SpeakersGrid />
      <SummitProgramme />
      <PartnersShowcase />
    </>
  );
};
