import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, FileText, Mic, StickyNote, Globe2, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { listConfirmedAbstracts, type ConfirmedAbstract } from '../../services/confirmedAbstract.service';
import { getApiErrorMessage } from '../../services/api';

// Full-width banner — used both on the grid card (top ~45%, see the card
// markup below, which fixes its own height via aspect-ratio so that
// percentage means something) and the detail modal's header (fixed height
// there instead, since the modal isn't itself aspect-ratio-constrained). A
// missing headshot still fills the same space with the branded initials
// tile, so a photo-less entry never looks broken or unbalanced next to ones
// that have one.
//
// object-top, not object-cover's default center crop: these are headshots
// submitted at all kinds of source aspect ratios, and a face is almost
// always in the upper portion of the frame, not dead-center — center-cropping
// a portrait-oriented photo into this wide banner shape was cutting heads off
// at the forehead. Anchoring to the top keeps the face in frame and crops
// from the bottom (chest/shoulders) instead, which is the safer loss.
const CardHeadshot = ({ name, photoUrl }: { name: string; photoUrl?: string }) =>
  photoUrl ? (
    <img src={photoUrl} alt={name} className="h-full w-full object-cover object-top" />
  ) : (
    <InitialsAvatar name={name} className="h-full w-full" />
  );

// A new, additive public page — the list of presenters the committee has
// actually confirmed, imported from their own tracker (see backend
// scripts/importConfirmedAbstracts.ts). Deliberately separate from
// AbstractSubmission.tsx (still the live "/abstracts/submit" form) — this
// only ever shows the safe subset of fields (see ConfirmedAbstract.model.ts):
// no author email, no visa/funding requests.
export const AbstractShowcase = () => {
  const { t } = useTranslation();

  // Built inside the component (not a module constant) so the labels can go
  // through t(), same reasoning as Navbar.tsx's NAV_ITEMS.
  const PRESENTATION_LABEL: Record<string, string> = {
    oral: t('abstractShowcase.presentationType.oral', 'Oral Presentation'),
    poster: t('abstractShowcase.presentationType.poster', 'Poster Presentation'),
  };

  const [abstracts, setAbstracts] = useState<ConfirmedAbstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('All');
  const [active, setActive] = useState<ConfirmedAbstract | null>(null);

  useEffect(() => {
    listConfirmedAbstracts()
      .then(setAbstracts)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const availableTracks = useMemo(
    () => ['All', ...Array.from(new Set(abstracts.map((a) => a.track).filter((t): t is string => !!t)))],
    [abstracts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return abstracts.filter((a) => {
      const matchesTrack = track === 'All' || a.track === track;
      const matchesQuery = !q || a.authorName.toLowerCase().includes(q) || a.title.toLowerCase().includes(q);
      return matchesTrack && matchesQuery;
    });
  }, [abstracts, query, track]);

  const countryCount = useMemo(
    () => new Set(abstracts.map((a) => a.country).filter((c): c is string => !!c)).size,
    [abstracts]
  );
  const stats = [
    { id: 'confirmedPresenters', label: t('abstractShowcase.stats.confirmedPresenters', 'Confirmed Presenters'), value: abstracts.length },
    { id: 'tracksRepresented', label: t('abstractShowcase.stats.tracksRepresented', 'Tracks Represented'), value: availableTracks.length - 1 },
    { id: 'countries', label: t('abstractShowcase.stats.countries', 'Countries'), value: countryCount },
  ];

  return (
    <>
      <PageHero
        eyebrow={t('abstractShowcase.hero.eyebrow', 'Research & Abstracts')}
        title={t('abstractShowcase.hero.title', 'Confirmed Abstract Presentations')}
        subtitle={t('abstractShowcase.hero.subtitle', "The researchers and presenters confirmed for the Summit's oral and poster sessions.")}
      />

      {!loading && abstracts.length > 0 && (
        <section className="border-b border-slate-100 bg-offwhite py-10">
          <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 text-center sm:px-6 lg:px-8">
            {stats.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.06}>
                <p className="font-display text-3xl font-bold text-navy sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {error && (
            <Reveal className="mb-8">
              <Banner variant="error">{error}</Banner>
            </Reveal>
          )}

          <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('abstractShowcase.search.placeholder', 'Search by author or title...')}
                className="w-full rounded-full border border-slate-200 bg-offwhite py-2.5 pl-10 pr-4 text-base sm:text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTracks.map((trackOption) => (
                <button
                  key={trackOption}
                  onClick={() => setTrack(trackOption)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    track === trackOption ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {trackOption === 'All' ? t('abstractShowcase.filters.all', 'All') : trackOption}
                </button>
              ))}
            </div>
          </Reveal>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-offwhite sm:h-52" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              {abstracts.length === 0 ? (
                <>
                  <p className="font-display text-lg font-semibold text-navy">{t('abstractShowcase.empty.title', 'Confirmations coming soon')}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    {t(
                      'abstractShowcase.empty.body',
                      'We’re still finalizing the confirmed presenter list. Check back soon, or submit your own abstract.'
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-navy">{t('abstractShowcase.filters.noMatch', 'No presentations match your filters')}</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setTrack('All');
                    }}
                    className="mt-3 text-sm font-semibold text-orange hover:text-orange-hover"
                  >
                    {t('abstractShowcase.filters.clear', 'Clear filters')}
                  </button>
                </>
              )}
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((abstract, i) => (
                <Reveal key={abstract._id} delay={i * 0.05}>
                  <button onClick={() => setActive(abstract)} className="group block w-full text-left">
                    {/* Row layout — photo left at full row height, details right.
                        Fixed height (not aspect-ratio) since a row card doesn't
                        need the "percentage height needs a defined parent
                        height" workaround the column layout did — the image
                        just takes h-full off this row directly. 40/60 image-
                        to-text width split: enough for a face to actually read
                        at this size without starving the title/track text next
                        to it. */}
                    <div className="flex h-48 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5 sm:h-52">
                      <div className="relative h-full w-2/5 shrink-0 overflow-hidden bg-navy-secondary">
                        <CardHeadshot name={abstract.authorName} photoUrl={abstract.photoUrl} />
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-orange backdrop-blur-sm">
                          {abstract.presentationType === 'poster' ? <StickyNote size={12} /> : <Mic size={12} />}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-center overflow-hidden p-4 text-left">
                        <p className="font-display text-[15px] font-semibold leading-snug text-navy line-clamp-2">
                          {abstract.authorName}
                        </p>
                        {abstract.country && <p className="text-xs text-slate-400">{abstract.country}</p>}

                        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-snug text-slate-600">{abstract.title}</p>

                        {abstract.track && (
                          <span className="mt-auto line-clamp-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-orange">
                            {abstract.track}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy py-20">
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">{t('abstractShowcase.cta.eyebrow', 'Have research to share?')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{t('abstractShowcase.cta.heading', 'Submit Your Abstract')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              {t('abstractShowcase.cta.body', 'Share your research with the Summit’s Research & Abstracts track.')}
            </p>
            <ButtonLink to="/abstracts/submit" variant="secondary" className="mt-6 !border-white/40 !bg-white/10">
              {t('abstractShowcase.cta.apply', 'Submit an Abstract')}
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <button
                onClick={() => setActive(null)}
                aria-label={t('common.close', 'Close')}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-sm hover:bg-navy/80"
              >
                <X size={18} />
              </button>

              {/* Row header — same photo-left/details-right treatment as the
                  card, at modal scale, instead of the full-width banner this
                  used before. */}
              <div className="flex h-56 w-full overflow-hidden rounded-t-2xl sm:h-64">
                <div className="relative h-full w-2/5 shrink-0 overflow-hidden bg-navy-secondary">
                  <CardHeadshot name={active.authorName} photoUrl={active.photoUrl} />
                </div>
                <div className="flex flex-1 flex-col justify-center overflow-hidden p-5 text-left">
                  <p className="font-display text-lg font-semibold leading-snug text-navy line-clamp-2">{active.authorName}</p>
                  {active.country && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Globe2 size={12} /> {active.country}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-navy-secondary px-3 py-1 text-[11px] font-semibold text-white">
                      {active.presentationType === 'poster' ? <StickyNote size={12} /> : <Mic size={12} />}
                      {active.presentationType
                        ? PRESENTATION_LABEL[active.presentationType]
                        : t('abstractShowcase.detail.presentation', 'Presentation')}
                    </span>
                    {active.track && (
                      <span className="flex items-center gap-1 rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold text-orange">
                        <Layers size={12} /> <span className="line-clamp-1">{active.track}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-7">
                <div className="rounded-xl bg-offwhite p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <FileText size={12} /> {t('abstractShowcase.detail.abstractTitle', 'Abstract Title')}
                  </p>
                  <h3 className="mt-1.5 whitespace-pre-line font-display text-base font-semibold leading-snug text-navy">{active.title}</h3>
                </div>
                <p className="mt-4 text-center text-xs text-slate-400">
                  {t('abstractShowcase.detail.abstractCode', 'Abstract Code: {{code}}', { code: active.code })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
