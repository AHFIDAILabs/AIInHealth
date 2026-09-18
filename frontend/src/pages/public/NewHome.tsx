import { motion, type Variants } from 'framer-motion';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { VENUE_SHORT } from '../../lib/siteInfo';
import { ConvenedWith } from '../../components/home/ConvenedWith';
import { ConfirmedVoices } from '../../components/home/ConfirmedVoices';
// import { NewsletterCapture } from '../../components/home/NewsletterCapture';
import { CountdownCard } from '../../components/home-v2/CountdownCard.tsx';
import { ProgrammeTimeline } from '../../components/home-v2/ProgrammeTimeline.tsx';
import { PartnersShowcase } from '../../components/home-v2/PartnersShowcase.tsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// TODO(design assets): confirm this is the same Abuja "You Are Welcome"
// monument photo used in the approved mockup — reusing the existing import
// on the assumption it is. Swap the path if a different/higher-res file
// should be used instead.
import heroBg from '../../assets/images/hero_bg.webp';

// TODO(design assets): the mockup's hero "theme" card (light-blue panel with
// the THEME tag, headline, and partner-logo row) is a flattened graphic asset
// that doesn't exist in this repo yet. Drop the real file in
// src/assets/images/ and update this import + path before shipping — a
// placeholder gradient box renders in its place until then.
// import themePreview from '../../assets/images/theme_preview.png';

// Sections below are carried over from the previous Home.tsx unchanged,
// pending your call on whether to keep, cut, or restyle them — see the
// flags called out alongside this handoff. Rendered as opaque, already-
// wired components so nothing about their backend hookups changes here.
// import { InnovatorsShowcase } from '../../components/home/InnovatorsShowcase';
import { MediaHighlights } from '../../components/home/MediaHighlights';
// import { PressQuoteBand } from '../../components/home/PressQuoteBand';
// import { FindYourJourney } from '../../components/home/FindYourJourney';
// import { AbujaExperience } from '../../components/home/AbujaExperience';
import homePageBg from '../../assets/images/AI in Health Summit 2026 - Website.webp';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

export const NewHome = () => {
  useDocumentTitle('Abuja, Nigeria');

  return (
    <>
      {/* Hero — two-panel split matching the approved mockup. Sits directly
          under the shared fixed/overlay Navbar (unchanged), so this stays
          full-bleed at the top rather than floating with a visible gap the
          way the original static mockup did on a non-fixed white header. */}
      <section className="relative isolate overflow-hidden bg-navy">
        <div className="flex flex-col w-full gap-6 px-0 pt-20 lg:grid lg:grid-cols-[7fr_3fr] lg:gap-6 lg:px-6 lg:pt-24 lg:pb-6">
          {/* Left panel — photo + headline */}
          <div className="relative flex min-h-[480px] flex-col w-full justify-center gap-6 overflow-hidden px-6 py-14 sm:px-10 lg:min-h-[560px] lg:rounded-3xl lg:px-12">
            <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy/35 to-navy/75" />

            <motion.div initial="hidden" animate="show" className="relative">
              <motion.span
                custom={0}
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-orange/40 bg-orange/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-orange"
              >
                19&ndash;20 October 2026 &middot; Abuja, Nigeria
              </motion.span>

              <motion.h1
                custom={1}
                variants={fadeUp}
                className="mt-5 max-w-xl font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl"
              >
                Artificial <span className="text-orange">Intelligence</span> in Health Summit 2026
              </motion.h1>

              <motion.h1 className="mt-4 font-display text-lg font-bold leading-snug text-white/90 sm:text-xl">
                    Catalyzing Country AI-in-Health Framework for Transformative Healthcare Systems
                  </motion.h1>

                      <motion.div custom={3} variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-orange/20 bg-gray-700 px-4 py-2 text-xs font-extrabold text-white">
                  2-day summit + showcase
                </span>
                <span className="rounded-full border border-orange/20 bg-gray-700 px-4 py-2 text-xs font-extrabold text-white">
                  AI &amp; Universal Health Coverage
                </span>
                <span className="rounded-full border border-orange-500 bg-orange-500 px-4 py-2 text-xs font-extrabold text-white">
                  Nigeria &amp; the AU region
                </span>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} className="relative mt-8 max-w-lg">
                <CountdownCard />
              </motion.div>
            </motion.div>
          </div>

          {/* Right panel — theme card + primary CTAs */}
          <Reveal delay={0.25} className="flex w-full flex-col gap-4 p-2 sm:px-10 lg:px-0 lg:py-0 lg:rounded-3xl bg-white">
            <div className="flex flex-1 flex-col gap-4 rounded-3xl  bg-white p-0">
              {/* Placeholder until the real theme-card image asset is dropped in —
                  see the TODO at the top of this file. */}
              <div className=" items-center justify-center rounded-3xl bg-gradient-to-b from-[#dfe9f3] to-[#eef3f8] p-0 text-center">
                <div>
                 
            <img src={homePageBg} alt="Theme card " className="w-full object-fill lg:rounded-3xl p-2" />
                      <motion.p custom={2} variants={fadeUp} className="w-full p-5 text-[15px] leading-relaxed font-semibold text-gray-700">
                Nigeria&rsquo;s premier platform for AI-enabled healthcare, convening national and international
                leaders to build practical pathways for responsible AI adoption across health systems.
              </motion.p>

          
                </div>
              </div>

              <div className="flex flex-col gap-3 p-5">
                <ButtonLink to="/register" variant="primary" className="!w-full !justify-center">
                  Register Interest
                </ButtonLink>
                <ButtonLink
                  to="/partners"
                  variant="secondary"
                  className="!w-full !justify-center !border-slate-200 !bg-white !text-navy hover:!bg-offwhite"
                >
                  Become a Partner
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Backed-by strip — unchanged, real published partners */}
      <ConvenedWith />

      {/* Speakers — unchanged, real published speakers */}
      <ConfirmedVoices />

      {/* Programme timeline — new, real published sessions with the same
          fallback pattern as the /agenda page */}
      <ProgrammeTimeline />

      {/* Partners, grouped by real category */}
      <PartnersShowcase />

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange to-orange-hover py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-[100px]"
        />

        <Reveal className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white">
            Applications Open
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold text-white sm:text-3xl">Join the Conversation</h2>
          <p className="mt-4 text-white/90">
            Join policymakers, innovators, and investors shaping the future of AI-powered healthcare in Nigeria and
            across Africa.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ButtonLink to="/register" variant="secondary" className="!bg-navy !border-navy">
              Register Interest
            </ButtonLink>
            <ButtonLink to="/partners" variant="secondary" className="!bg-white/10 !border-white/40">
              Become a Partner
            </ButtonLink>
          </div>
          <p className="mt-8 text-xs font-medium text-white/70">
            19&ndash;20 October 2026 &middot; {VENUE_SHORT}, Nigeria
          </p>
        </Reveal>
      </section>

       <MediaHighlights />
    </>
  );
};