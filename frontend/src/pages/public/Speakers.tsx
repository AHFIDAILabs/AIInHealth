import { useEffect, useMemo, useState } from 'react';
import { Landmark, Stethoscope, Rocket, TrendingUp, Globe2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { SpeakerModal } from '../../components/ui/SpeakerModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

export const Speakers = () => {
  const { t } = useTranslation();

  // Broader categories the Summit convenes beyond the confirmed roster below —
  // no individuals invented here, just the groups the programme is built
  // around. Built inside the component (not a module constant) so `title`/
  // `body` can go through t() — `id` is the stable, untranslated identifier
  // used for `key={cat.id}` below, same reasoning as Navbar.tsx's NAV_ITEMS.
  const CATEGORIES = [
    {
      id: 'government',
      icon: Landmark,
      title: t('speakers.categories.government.title', 'Government & Policy Leaders'),
      body: t(
        'speakers.categories.government.body',
        'Federal and state health ministries, regulators, and continental policy bodies shaping the national AI-in-health framework.'
      ),
    },
    {
      id: 'globalHealth',
      icon: Globe2,
      title: t('speakers.categories.globalHealth.title', 'Global Health Institutions'),
      body: t(
        'speakers.categories.globalHealth.body',
        'WHO, multilateral agencies, and development partners bringing global standards and financing perspectives.'
      ),
    },
    {
      id: 'clinical',
      icon: Stethoscope,
      title: t('speakers.categories.clinical.title', 'Clinical & Research Innovators'),
      body: t(
        'speakers.categories.clinical.body',
        'Clinicians, researchers, and academic institutions building and validating AI tools in African health settings.'
      ),
    },
    {
      id: 'healthtech',
      icon: Rocket,
      title: t('speakers.categories.healthtech.title', 'Healthtech Founders & Builders'),
      body: t(
        'speakers.categories.healthtech.body',
        'Startup founders and engineers demonstrating AI-driven diagnostics, operations, and delivery tools already in use.'
      ),
    },
    {
      id: 'investors',
      icon: TrendingUp,
      title: t('speakers.categories.investors.title', 'Investors & Development Partners'),
      body: t(
        'speakers.categories.investors.body',
        'Venture investors and impact funders sourcing Africa’s next wave of health AI investment.'
      ),
    },
  ];

  const [speakers, setSpeakers] = useState<AdminSpeaker[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('All');
  const [active, setActive] = useState<AdminSpeaker | null>(null);

  useEffect(() => {
    listPublicSpeakers()
      .then(setSpeakers)
      .catch(() =>
        setLoadError(t('speakers.error.loadFailed', 'Could not load speakers right now. Please try again shortly.'))
      );
  }, [t]);

  // Derived from whichever speakers are actually published, not a separate
  // fixed list — so the filter pills always match the real tracks in use
  // (and only show ones with at least one speaker), same reasoning as
  // InnovationShowcase's availableTracks.
  const filterTracks = useMemo(() => ['All', ...Array.from(new Set((speakers ?? []).map((s) => s.track)))], [speakers]);

  const filtered = useMemo(() => {
    if (!speakers) return [];
    const q = query.trim().toLowerCase();
    return speakers.filter((s) => {
      const matchesTrack = track === 'All' || s.track === track;
      const matchesQuery = !q || s.fullName.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
      return matchesTrack && matchesQuery;
    });
  }, [speakers, query, track]);

  const noSpeakersAtAll = speakers !== null && speakers.length === 0;

  return (
    <>
      <PageHero
        eyebrow={t('speakers.hero.eyebrow', 'Speakers')}
        title={t('speakers.hero.title', 'Voices Shaping AI in African Healthcare')}
        subtitle={t(
          'speakers.hero.subtitle',
          'Ministers, regulators, and global health leaders confirmed for Abuja, with more of the lineup still being finalized.'
        )}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {!noSpeakersAtAll && (
            <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('speakers.search.placeholder', 'Search speakers...')}
                  className="w-full rounded-full border border-slate-200 bg-offwhite py-2.5 pl-10 pr-4 text-base sm:text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filterTracks.map((trackOption) => (
                  <button
                    key={trackOption}
                    onClick={() => setTrack(trackOption)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      track === trackOption
                        ? 'border-orange bg-orange text-white'
                        : 'border-slate-200 text-slate-600 hover:border-orange/40'
                    }`}
                  >
                    {trackOption === 'All' ? t('speakers.filters.all', 'All') : trackOption}
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {loadError ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">{loadError}</p>
            </Reveal>
          ) : speakers === null ? (
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          ) : noSpeakersAtAll ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">{t('speakers.empty.title', 'Speakers to be announced')}</p>
              <p className="mt-2 text-sm text-slate-500">{t('speakers.empty.subtitle', 'Check back soon as the full lineup is confirmed.')}</p>
            </Reveal>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">{t('speakers.filters.noMatch', 'No speakers match your filters')}</p>
              <button
                onClick={() => {
                  setQuery('');
                  setTrack('All');
                }}
                className="mt-3 text-sm font-semibold text-orange hover:text-orange-hover"
              >
                {t('speakers.filters.clear', 'Clear filters')}
              </button>
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((speaker, i) => (
                <Reveal key={speaker._id} delay={i * 0.05}>
                  <button onClick={() => setActive(speaker)} className="group block w-full text-left">
                    <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                      <div className="relative aspect-[4/5] overflow-hidden">
                        {speaker.photoUrl ? (
                          <img
                            src={speaker.photoUrl}
                            alt={speaker.photoAlt || speaker.fullName}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <InitialsAvatar name={speaker.fullName} className="h-full w-full" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-orange opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="p-4">
                        {/* <span className="text-[10px] font-semibold uppercase tracking-wide text-orange">
                          {speaker.track}
                        </span> */}
                        <p className="mt-1.5 font-display text-[15px] font-semibold leading-snug text-navy">
                          {speaker.fullName}
                        </p>
                        <p className="mt-1 text-xs leading-snug text-slate-500">{speaker.title}</p>
                      </div>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* More voices — categories beyond the confirmed roster above */}
      <section className="border-t border-slate-100 bg-offwhite py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">{t('speakers.categories.eyebrow', 'Still Being Finalized')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">{t('speakers.categories.heading', 'More Voices at the Summit')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">
              {t(
                'speakers.categories.subtitle',
                'Beyond the confirmed speakers above, delegates convene across five groups shaping the programme.'
              )}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, i) => (
              <Reveal key={cat.id} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-orange/40">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-secondary text-orange">
                    <cat.icon size={20} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-navy">{cat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{cat.body}</p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={CATEGORIES.length * 0.06}>
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="font-display text-lg font-semibold text-navy">{t('speakers.cta.speakingHeading', 'Speaking at the Summit?')}</p>
                <p className="mt-2 text-sm text-slate-600">{t('speakers.cta.speakingBody', 'We’re still confirming our full lineup.')}</p>
                <ButtonLink to="/register" variant="secondary" className="!mt-4 !border-slate-300 !bg-white !text-navy !py-2.5 !text-sm">
                  {t('speakers.cta.nominate', 'Nominate / Apply to Speak')}
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SpeakerModal speaker={active} onClose={() => setActive(null)} />
    </>
  );
};
