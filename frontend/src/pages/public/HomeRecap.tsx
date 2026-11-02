import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { ButtonLink } from '../../components/ui/Button';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';
import { buildEventJsonLd, buildOrganizationJsonLd } from '../../lib/seo';
import { SpeakersGrid } from '../../components/home/SpeakersGrid';
import { SummitProgramme } from '../../components/home/SummitProgramme';
import { WaiHealthSpotlight } from '../../components/home/WaiHealthSpotlight';
import { PartnersShowcase } from '../../components/home-v2/PartnersShowcase';
import { HeroMediaCarousel } from '../../features/recap/components/HeroMediaCarousel';
import { AlbumGrid, useAlbumIndex, useAlbum } from '../../features/gallery';
import { VideoEmbed } from '../../design-system/primitives';
import { VENUE_NAME, VENUE_STREET_ADDRESS, VENUE_CITY } from '../../lib/siteInfo';
import homePageBg from '../../assets/images/AI in Health Summit 2026 - Website.webp';

const VIDEOS_ALBUM_ID = '72177720336311834';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

// The post-event homepage, built as a close replica of HomeMain.tsx's own
// structure and content density per direct request — most sections (Speakers,
// Programme, Partners, WAI-Health spotlight) carry over close to unchanged,
// since the ask was "people still need to see majority of the content," not a
// stripped-down recap. Only the pieces that were specifically pre/live-event
// mechanics are swapped: the static hero photo + CountdownCard become a real-
// photo carousel + Join-2027/Compendium CTAs, WatchLiveSection becomes real
// highlights from Flickr, and the three purely live-event mechanics
// (PromoBanner, LeaderboardTicker, LeaderboardJoinPopup) are dropped entirely
// — per direct request, since there's nothing left to claim or compete for.
// HomeMain.tsx itself (and this file's own predecessor, PostEventHome.tsx)
// stay retired the same way as Home.tsx/NewHome.tsx: unrouted, untouched.
export const HomeRecap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { albums } = useAlbumIndex();
  const { photos: videos } = useAlbum(VIDEOS_ALBUM_ID);

  const heroPhotos = useMemo(
    () =>
      (albums ?? [])
        .filter((a) => a.day !== 'special' && a.coverPhotoUrl)
        .slice(0, 6)
        .map((a) => a.coverPhotoUrl as string),
    [albums]
  );
  const previewAlbums = (albums ?? []).filter((a) => a.day !== 'special').slice(0, 8);

  return (
    <>
      <SEO
        title="AI in Health Summit 2026 | Abuja, Nigeria"
        titleIsFull
        description="AI in Health Summit 2026: Abuja, Nigeria, 19-20 October 2026. Convened by AHFID, building Nigeria's national AI-in-health framework."
        path="/"
        structuredData={[buildEventJsonLd(), buildOrganizationJsonLd()]}
      />

      {/* Cancels PublicLayout's <main> padding-top, same as HomeMain's hero —
          the photo carousel wants to run full-bleed behind the transparent
          nav all the way to the true viewport top. */}
      <section
        className="relative isolate overflow-hidden bg-navy"
        style={{ marginTop: 'calc(var(--header-height, 4rem) * -1)' }}
      >
        <div className="flex w-full flex-col gap-6 px-0 pt-20 lg:grid lg:grid-cols-[7fr_3fr] lg:gap-6 lg:px-6 lg:pt-24 lg:pb-6">
          {/* Left panel — real 2026 photos + headline + 2027/Compendium pills */}
          <div className="relative flex min-h-[480px] w-full flex-col justify-center gap-6 overflow-hidden px-6 py-14 sm:px-10 lg:min-h-[560px] lg:rounded-3xl lg:px-12">
            <HeroMediaCarousel photos={heroPhotos} />
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

              {/* Replaces CountdownCard — the event already happened, so a
                  compact pill pair (same shape as the Date/Venue pills above)
                  reinforces the same two CTAs the right panel leads with,
                  rather than a countdown-sized block for what's now just two
                  links. */}
              <motion.div custom={3} variants={fadeUp} className="relative mt-4 flex flex-wrap gap-3">
                <ButtonLink to="/2027" variant="primary">
                  Join the 2027 List <ArrowRight size={14} className="ml-1" />
                </ButtonLink>
                <ButtonLink to="/compendium" variant="secondary">
                  Browse the Compendium
                </ButtonLink>
              </motion.div>
            </motion.div>
          </div>

          {/* Right panel — theme card + primary CTAs. Register Interest/Become
              a Partner (stale — 2026 registration is closed) replaced with
              the same Join-2027/Compendium pair as the primary CTAs here. */}
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
                <ButtonLink to="/2027" variant="primary" className="!w-full !justify-center">
                  Join the 2027 List
                </ButtonLink>
                <ButtonLink
                  to="/compendium"
                  variant="secondary"
                  className="!w-full !justify-center !border-slate-200 !bg-white !text-navy hover:!bg-offwhite"
                >
                  Browse the Compendium
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Replaces WatchLiveSection — the livestream is over; this shows real
          highlights from the event instead. */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Relive the Summit</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">Sessions in Pictures</h2>
            <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-orange" />
          </Reveal>

          {previewAlbums.length > 0 && (
            <div className="mt-10">
              <AlbumGrid albums={previewAlbums} onOpen={(album) => navigate(`/2026/gallery/${album.id}`)} />
              <div className="mt-8 flex justify-center">
                <ButtonLink to="/2026/gallery" variant="secondary" className="!border-slate-300 !bg-white !text-navy hover:!bg-offwhite">
                  View All Sessions <ArrowRight size={15} className="ml-1.5" />
                </ButtonLink>
              </div>
            </div>
          )}

          {videos && videos.length > 0 && (
            <div className="mt-16">
              <h3 className="text-center font-display text-xl font-bold text-navy">Highlight Videos</h3>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {videos.slice(0, 4).map((video) => (
                  <VideoEmbed key={video.id} provider="flickr" videoId={video.id} posterUrl={video.largeUrl} title={video.title || 'AI in Health Summit 2026'} />
                ))}
              </div>
              {videos.length > 4 && (
                <div className="mt-6 flex justify-center">
                  <ButtonLink to="/2026/videos" variant="secondary" className="!border-slate-300 !bg-white !text-navy hover:!bg-offwhite">
                    Watch All Videos
                  </ButtonLink>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <WaiHealthSpotlight ctaTo="/2026/gallery" ctaLabel="See the Breakfast in Pictures" />
      <SpeakersGrid />
      <SummitProgramme />
      <PartnersShowcase />
    </>
  );
};
