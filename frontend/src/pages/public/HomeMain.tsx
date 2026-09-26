import { motion, type Variants } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SpeakersGrid } from '../../components/home/SpeakersGrid';
import { SummitProgramme } from '../../components/home/SummitProgramme';
import { PartnersShowcase } from '../../components/home-v2/PartnersShowcase';
import { CountdownCard } from '../../components/home-v2/CountdownCard';
import { VENUE_NAME, VENUE_STREET_ADDRESS, VENUE_CITY } from '../../lib/siteInfo';
import heroBg from '../../assets/Image (2).png';
import homePageBg from '../../assets/images/AI in Health Summit 2026 - Website.webp';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

// The production homepage. Hero reverted to the two-panel split from
// NewHome.tsx (left: photo + headline + countdown; right: theme card +
// primary CTAs) per direct request — only the left panel's text content
// (headline/subtitle/chips) comes from this page's own copy instead of
// NewHome's; the right panel and the CountdownCard are unchanged from there.
// The standalone Countdown section that used to sit below the hero is gone
// now that the countdown lives in the hero itself.
export const HomeMain = () => {
  const { t } = useTranslation();
  useDocumentTitle('Home');

  return (
    <>
      {/* Cancels PublicLayout's <main> padding-top (there so plain content
          pages clear the fixed nav) — this hero wants the photo to run
          full-bleed behind that transparent nav instead, all the way to the
          true viewport top. Reads the same measured --header-height so it
          exactly matches at every width, not just the ones a fixed
          breakpoint guess happened to cover. */}
      <section
        className="relative isolate overflow-hidden bg-navy"
        style={{ marginTop: 'calc(var(--header-height, 4rem) * -1)' }}
      >
        <div className="flex w-full flex-col gap-6 px-0 pt-20 lg:grid lg:grid-cols-[7fr_3fr] lg:gap-6 lg:px-6 lg:pt-24 lg:pb-6">
          {/* Left panel — photo + headline + countdown */}
          <div className="relative flex min-h-[480px] w-full flex-col justify-center gap-6 overflow-hidden px-6 py-14 sm:px-10 lg:min-h-[560px] lg:rounded-3xl lg:px-12">
            <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy/35 to-navy/75" />

            <motion.div initial="hidden" animate="show" className="relative">
              <motion.h1
                custom={0}
                variants={fadeUp}
                className="max-w-xl font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl"
              >
                <Trans
                  i18nKey="home.hero.title"
                  defaults="Artificial <styled>Intelligence</styled> in Health Summit 2026"
                  components={{ styled: <span className="text-orange text-italic" /> }}
                />
              </motion.h1>

              <motion.p
                custom={1}
                variants={fadeUp}
                className="mt-4 max-w-xl text-lg font-semibold leading-snug text-slate-100 sm:text-xl"
              >
                {t(
                  'home.hero.subtitle',
                  'Harnessing Artificial Intelligence to Strengthen Health Systems and Accelerate Universal Health Coverage in Nigeria and Africa.'
                )}
              </motion.p>

              {/* Date / Venue cards — both follow the exact same shape now
                  (icon + bold primary line + muted secondary line, equal
                  height via items-stretch) so they read as a matched pair.
                  Venue used to be a plain single-line pill crammed with the
                  full street address, which broke its shape; giving Date a
                  matching second line (rather than leaving it short next to
                  a now-taller Venue) fixes the mismatched, uneven look that
                  created rather than trying to shrink Venue back down. */}
              <motion.div custom={2} variants={fadeUp} className="mt-6 flex flex-wrap items-stretch gap-3 sm:gap-4">
                <span className="flex max-w-[220px] items-start gap-2 rounded-tl-3xl rounded-br-3xl border border-navy/15 bg-white px-4 py-3">
                  <CalendarDays size={15} className="mt-0.5 shrink-0 text-orange" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold uppercase tracking-wide text-orange sm:text-sm">19 &ndash; 20 Oct 2026</span>
                    <span className="mt-0.5 block text-[11px] font-medium leading-snug text-navy/50 sm:text-xs">
                      {t('home.hero.dateWeekdays', 'Monday – Tuesday')}
                    </span>
                  </span>
                </span>
                <span className="flex max-w-xs items-start gap-2 rounded-tl-3xl rounded-br-3xl border border-navy/15 bg-white px-4 py-3 sm:max-w-sm">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-orange" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold uppercase tracking-wide text-orange sm:text-sm">{VENUE_NAME}</span>
                    <span className="mt-0.5 block text-[11px] font-medium leading-snug text-navy/50 sm:text-xs">
                      {VENUE_STREET_ADDRESS}, {VENUE_CITY}
                    </span>
                  </span>
                </span>
              </motion.div>

              <motion.div custom={3} variants={fadeUp} className="relative mt-8 max-w-3xl">
                <CountdownCard />
              </motion.div>
            </motion.div>
          </div>

          {/* Right panel — theme card + primary CTAs. lg:self-start keeps this
              grid item sized to its own content instead of the default grid
              stretch-to-row-height. */}
          <Reveal delay={0.25} className="flex w-full flex-col gap-4 bg-white p-2 sm:px-10 lg:self-start lg:rounded-3xl lg:px-0 lg:py-0">
            <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white p-0">
              <div className="items-center justify-center rounded-3xl bg-gradient-to-b from-[#dfe9f3] to-[#eef3f8] p-0 text-center">
                <div>
                  <img src={homePageBg} alt={t('home.hero.themeCardAlt', 'Theme card')} className="w-full object-fill p-2 lg:rounded-3xl" />
                  <p className="w-full p-5 text-[15px] font-semibold leading-relaxed text-gray-700">
                    {t(
                      'home.hero.themeCardBody',
                      "Nigeria’s premier platform for AI-enabled healthcare, convening national and international leaders to build practical pathways for responsible AI adoption across health systems."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-5">
                <ButtonLink to="/register" variant="primary" className="!w-full !justify-center">
                  {t('home.hero.registerInterest', 'Register Interest')}
                </ButtonLink>
                <ButtonLink
                  to="/partners"
                  variant="secondary"
                  className="!w-full !justify-center !border-slate-200 !bg-white !text-navy hover:!bg-offwhite"
                >
                  {t('home.hero.becomePartner', 'Become a Partner')}
                </ButtonLink>
              </div>
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
