import { useEffect, useMemo, useState } from 'react';
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
import { HeroVideoBackground, useHeroVideos } from '../../features/recap/components/HeroVideoBackground';
import { AlbumGrid, useAlbumIndex, useAlbum } from '../../features/gallery';
import { VideoEmbed } from '../../design-system/primitives';
import { VENUE_NAME, VENUE_STREET_ADDRESS, VENUE_CITY } from '../../lib/siteInfo';
import { fetchPublicConfirmedCount } from '../../services/registration.service';
import { useCountUp } from '../../hooks/useCountUp';
import homePageBg from '../../assets/images/AI in Health Summit 2026 - Website.webp';

const VIDEOS_ALBUM_ID = '72177720336311834';
const WAI_HEALTH_ALBUM_ID = '72177720336267648';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

// The post-event homepage, built as a close replica of HomeMain.tsx's own
// structure and content density per direct request. Hero is a single,
// unified section (no left/right split) — background is real 2026 intro
// video clips once backend/scripts/import-hero-videos.ts has been run
// against the owner's chosen IDs (useHeroVideos resolves null until then),
// falling back to an animated photo carousel sourced broadly across every
// album in the meantime. "Sessions in Pictures" / "Highlight Videos" replace
// WatchLiveSection with real Flickr content; the old hero's theme card now
// sits beside the highlight videos instead. WaiHealthSpotlight, Speakers,
// Programme, and Partners carry over close to unchanged. PromoBanner,
// LeaderboardTicker, and LeaderboardJoinPopup are dropped entirely — all
// three were live-event-only mechanics with nothing left to claim or
// compete for. HomeMain.tsx and this file's own first-draft predecessor,
// PostEventHome.tsx, stay retired the same way as Home.tsx/NewHome.tsx:
// unrouted, untouched.
export const HomeRecap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { albums } = useAlbumIndex();
  const { photos: videos } = useAlbum(VIDEOS_ALBUM_ID);
  const heroVideos = useHeroVideos();

  // Pulled from every album (not one specific one) so both the hero
  // background and the relocated theme card draw from the same broad,
  // ever-growing pool instead of a single hand-picked set.
  const allEventPhotos = useMemo(
    () => (albums ?? []).filter((a) => a.coverPhotoUrl).map((a) => a.coverPhotoUrl as string),
    [albums]
  );
  const heroPhotos = useMemo(() => allEventPhotos.slice(0, 8), [allEventPhotos]);
  const themeCardImages = useMemo(
    () => (allEventPhotos.length > 0 ? allEventPhotos.slice(-6) : [homePageBg]),
    [allEventPhotos]
  );
  const previewAlbums = (albums ?? []).filter((a) => a.day !== 'special').slice(0, 8);

  // Real, live count — never a hardcoded figure (brief's "no fabricated
  // content" rule). Rounded DOWN (never up — a "+" figure must always be
  // truthfully exceeded, not just close) to the nearest 50 for a clean "N+"
  // headline that still stays close to the real number; renders nothing at
  // all until a real, positive count has loaded.
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  useEffect(() => {
    fetchPublicConfirmedCount()
      .then(setConfirmedCount)
      .catch(() => setConfirmedCount(null));
  }, []);
  const roundedCount = confirmedCount && confirmedCount >= 50 ? Math.floor(confirmedCount / 50) * 50 : (confirmedCount ?? 0);
  const animatedCount = useCountUp(roundedCount);

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
          the background wants to run full-bleed behind the transparent nav
          all the way to the true viewport top. One unified section, centered
          content — no left/right split. */}
      <section
        className="relative isolate flex min-h-[560px] w-full flex-col items-center justify-center overflow-hidden bg-navy px-4 py-28 text-center sm:px-8 lg:min-h-[640px]"
        style={{ marginTop: 'calc(var(--header-height, 4rem) * -1)' }}
      >
        {heroVideos ? <HeroVideoBackground videos={heroVideos} /> : <HeroMediaCarousel photos={heroPhotos} />}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/30 to-navy/70" />

        <motion.div initial="hidden" animate="show" className="relative mx-auto max-w-3xl">
          <motion.h1
            custom={0}
            variants={fadeUp}
            className="font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl"
          >
            <Trans
              i18nKey="home.hero.title"
              defaults="Artificial <styled>Intelligence</styled> in Health Summit 2026"
              components={{ styled: <span className="text-orange text-italic" /> }}
            />
          </motion.h1>

          {/* Real, live confirmed-attendee count (registration.service.ts's
              fetchPublicConfirmedCount) — falls back to the original mission
              subtitle only for the brief moment before it's loaded, never a
              placeholder/invented figure. */}
          {roundedCount > 0 ? (
            <motion.div custom={1} variants={fadeUp} className="mx-auto mt-5 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange">Thank You</p>
              <p className="mt-2 font-display text-4xl font-black leading-none text-white [text-shadow:0_0_40px_rgba(249,115,22,0.35)] sm:text-5xl">
                {animatedCount.toLocaleString()}
                <span className="text-orange">+</span>
              </p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-slate-200 sm:text-base">Attendees</p>
              <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                Over two incredible days, you came together from across Nigeria and beyond to shape the future of AI
                in health. We couldn&rsquo;t have done it without you.
              </p>
            </motion.div>
          ) : (
            <motion.p
              custom={1}
              variants={fadeUp}
              className="mx-auto mt-4 max-w-xl text-lg font-semibold leading-snug text-slate-100 sm:text-xl"
            >
              {t(
                'home.hero.subtitle',
                'Harnessing Artificial Intelligence to Strengthen Health Systems and Accelerate Universal Health Coverage in Nigeria and Africa.'
              )}
            </motion.p>
          )}

          <motion.div custom={2} variants={fadeUp} className="mt-6 flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
            <span className="flex max-w-[220px] items-start gap-2 rounded-tl-3xl rounded-br-3xl border border-navy/15 bg-white px-4 py-3">
              <CalendarDays size={15} className="mt-0.5 shrink-0 text-orange" />
              <span className="min-w-0 text-left">
                <span className="block text-[13px] font-bold uppercase tracking-wide text-orange sm:text-sm">19 &ndash; 20 Oct 2026</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-snug text-navy/50 sm:text-xs">
                  {t('home.hero.dateWeekdays', 'Monday – Tuesday')}
                </span>
              </span>
            </span>
            <span className="flex max-w-xs items-start gap-2 rounded-tl-3xl rounded-br-3xl border border-navy/15 bg-white px-4 py-3 sm:max-w-sm">
              <MapPin size={15} className="mt-0.5 shrink-0 text-orange" />
              <span className="min-w-0 text-left">
                <span className="block text-[13px] font-bold uppercase tracking-wide text-orange sm:text-sm">{VENUE_NAME}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-snug text-navy/50 sm:text-xs">
                  {VENUE_STREET_ADDRESS}, {VENUE_CITY}
                </span>
              </span>
            </span>
          </motion.div>

          {/* Replaces CountdownCard and the old right panel's Register
              Interest/Become a Partner buttons — the event already happened
              and 2026 registration is closed, so these are the only CTAs the
              hero needs now. */}
          <motion.div custom={3} variants={fadeUp} className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/2027" variant="primary">
              Join the 2027 List <ArrowRight size={16} className="ml-1" />
            </ButtonLink>
            <ButtonLink to="/compendium" variant="secondary">
              Browse the Compendium
            </ButtonLink>
          </motion.div>
        </motion.div>
      </section>

      {/* Replaces WatchLiveSection — the livestream is over; this shows real
          highlights from the event instead, as two subsections: images, then
          video (paired with the theme card that used to live in the hero). */}
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
            <div className="mt-16 grid gap-10 lg:grid-cols-[7fr_3fr]">
              <div>
                <h3 className="font-display text-xl font-bold text-navy">Highlight Videos</h3>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {videos.slice(0, 4).map((video) => (
                    <VideoEmbed
                      key={video.id}
                      provider="flickr"
                      videoId={video.id}
                      embedSrc={video.embedUrl}
                      posterUrl={video.largeUrl}
                      title={video.title || 'AI in Health Summit 2026'}
                    />
                  ))}
                </div>
                {videos.length > 4 && (
                  <div className="mt-6">
                    <ButtonLink to="/2026/videos" variant="secondary" className="!border-slate-300 !bg-white !text-navy hover:!bg-offwhite">
                      Watch All Videos
                    </ButtonLink>
                  </div>
                )}
              </div>

              {/* Relocated from the old hero's right panel. */}
              <Reveal delay={0.1} className="flex flex-col gap-4 self-start rounded-3xl border border-slate-200 bg-offwhite p-2">
                <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-white p-0">
                  <div className="items-center justify-center rounded-2xl bg-gradient-to-b from-[#dfe9f3] to-[#eef3f8] p-0 text-center">
                    <div>
                      <div className="relative aspect-[4/3] w-full overflow-hidden p-2">
                        <div className="relative h-full w-full overflow-hidden rounded-xl" role="img" aria-label={t('home.hero.themeCardAlt', 'Theme card')}>
                          <HeroMediaCarousel photos={themeCardImages} />
                        </div>
                      </div>
                      <p className="w-full p-5 text-[15px] font-semibold leading-relaxed text-gray-700">
                        {t(
                          'home.hero.themeCardBody',
                          "Nigeria’s premier platform for AI-enabled healthcare, convening national and international leaders to build practical pathways for responsible AI adoption across health systems."
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-5 pt-0">
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
          )}
        </div>
      </section>

      <WaiHealthSpotlight
        backgroundAlbumId={WAI_HEALTH_ALBUM_ID}
        ctaTo={`/2026/gallery/${WAI_HEALTH_ALBUM_ID}`}
        ctaLabel="See the Breakfast in Pictures"
      />
      <SpeakersGrid />
      <SummitProgramme />
      <PartnersShowcase />
    </>
  );
};
