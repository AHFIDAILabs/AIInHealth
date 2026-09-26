import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Globe2, Sparkles, Users, Layers, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import {
  listInnovationShowcaseEntries,
  type InnovationShowcaseEntry,
} from '../../services/innovationShowcaseEntry.service';
import { getApiErrorMessage } from '../../services/api';

// Full-width banner — used both on the grid card (top ~45%, see the card
// markup below, which fixes its own height via aspect-ratio so that
// percentage means something) and the detail modal's header (fixed height
// there instead, since the modal isn't itself aspect-ratio-constrained).
// object-contain (not object-cover, unlike the abstract page's real
// headshots) — cropping into a company logo instead of letterboxing it would
// cut off part of the actual mark.
const CardLogo = ({ name, logoUrl }: { name: string; logoUrl?: string }) =>
  logoUrl ? (
    <div className="flex h-full w-full items-center justify-center bg-offwhite p-5">
      <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-navy-secondary">
      <Sparkles className="text-orange" size={32} />
    </div>
  );

// A new, additive public page — the confirmed cohort of Innovation Showcase
// startups, imported from the judging tracker's own application data (see
// backend scripts/importInnovationShowcase.ts). Deliberately separate from
// InnovationShowcase.tsx (still the live "/innovation-showcase" admin-
// curated directory) — this page surfaces the richer application-form
// content (solution, problem, tech, TRL) that model never captured.
export const InnovationShowcaseConfirmed = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<InnovationShowcaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [active, setActive] = useState<InnovationShowcaseEntry | null>(null);

  useEffect(() => {
    listInnovationShowcaseEntries()
      .then(setEntries)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const availableCategories = useMemo(
    () => ['All', ...Array.from(new Set(entries.map((e) => e.category).filter((c): c is string => !!c)))],
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesCategory = category === 'All' || e.category === category;
      const matchesQuery =
        !q ||
        e.startupName.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.solutionName?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [entries, query, category]);

  const countryCount = useMemo(
    () => new Set(entries.map((e) => e.country).filter((c): c is string => !!c)).size,
    [entries]
  );
  const stats = [
    { id: 'confirmedStartups', label: t('innovationShowcaseConfirmed.stats.confirmedStartups', 'Confirmed Startups'), value: entries.length },
    { id: 'categories', label: t('innovationShowcaseConfirmed.stats.categories', 'Categories'), value: availableCategories.length - 1 },
    { id: 'countries', label: t('innovationShowcaseConfirmed.stats.countries', 'Countries'), value: countryCount },
  ];

  return (
    <>
      <PageHero
        eyebrow={t('innovationShowcaseConfirmed.hero.eyebrow', 'Innovation Showcase')}
        title={t('innovationShowcaseConfirmed.hero.title', 'Confirmed Showcase Startups')}
        subtitle={t(
          'innovationShowcaseConfirmed.hero.subtitle',
          'The health-AI startups confirmed to demo live at the Summit, selected through our judging process.'
        )}
      />

      {!loading && entries.length > 0 && (
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
                placeholder={t('innovationShowcaseConfirmed.search.placeholder', 'Search startups...')}
                className="w-full rounded-full border border-slate-200 bg-offwhite py-2.5 pl-10 pr-4 text-base sm:text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  title={c === 'All' ? t('innovationShowcaseConfirmed.filters.all', 'All') : c}
                  className={`max-w-[220px] truncate rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {c === 'All' ? t('innovationShowcaseConfirmed.filters.all', 'All') : c}
                </button>
              ))}
            </div>
          </Reveal>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl border border-slate-200 bg-offwhite" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              {entries.length === 0 ? (
                <>
                  <p className="font-display text-lg font-semibold text-navy">{t('innovationShowcaseConfirmed.empty.title', 'Confirmations coming soon')}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    {t('innovationShowcaseConfirmed.empty.body', 'We’re still finalizing the confirmed showcase cohort. Check back soon.')}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-navy">{t('innovationShowcaseConfirmed.filters.noMatch', 'No startups match your filters')}</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setCategory('All');
                    }}
                    className="mt-3 text-sm font-semibold text-orange hover:text-orange-hover"
                  >
                    {t('innovationShowcaseConfirmed.filters.clear', 'Clear filters')}
                  </button>
                </>
              )}
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry, i) => (
                <Reveal key={entry._id} delay={i * 0.05}>
                  <button onClick={() => setActive(entry)} className="group block w-full text-left">
                    {/* Fixed aspect ratio — not h-full off the grid row — so the
                        45/55 logo/text split below has an actual height to
                        resolve against instead of an ambiguous auto one. */}
                    <div className="flex aspect-[2/3] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                      <div className="h-[45%] w-full shrink-0 overflow-hidden">
                        <CardLogo name={entry.startupName} logoUrl={entry.logoUrl} />
                      </div>

                      <div className="flex flex-1 flex-col items-center overflow-hidden p-5 text-center">
                        <p className="font-display text-[15px] font-semibold leading-snug text-navy">{entry.startupName}</p>
                        {entry.country && <p className="text-xs text-slate-400">{entry.country}</p>}

                        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-snug text-slate-600">
                          {entry.description ?? entry.solutionDescription}
                        </p>

                        {entry.category && (
                          <span className="mt-auto line-clamp-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-orange">
                            {entry.category}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">{t('innovationShowcaseConfirmed.cta.eyebrow', 'Building in Health AI?')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{t('innovationShowcaseConfirmed.cta.heading', 'Showcase Your Innovation')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              {t('innovationShowcaseConfirmed.cta.body', 'We’re curating a floor of the boldest African health-AI builders for future editions.')}
            </p>
            <ButtonLink to="/register" variant="secondary" className="mt-6 !border-white/40 !bg-white/10">
              {t('innovationShowcaseConfirmed.cta.apply', 'Register Interest')}
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
              className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <button
                onClick={() => setActive(null)}
                aria-label={t('common.close', 'Close')}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-sm hover:bg-navy/80"
              >
                <X size={18} />
              </button>

              {/* Full-width logo — same treatment as the card, now at modal scale. */}
              <div className="h-56 w-full shrink-0 overflow-hidden rounded-t-2xl sm:h-64">
                <CardLogo name={active.startupName} logoUrl={active.logoUrl} />
              </div>

              <div className="p-7">
                <div className="flex flex-col items-center text-center">
                  <h3 className="font-display text-xl font-semibold text-navy">{active.startupName}</h3>
                  {active.country && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Globe2 size={12} /> {active.country}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {active.category && (
                      <span className="flex items-center gap-1 rounded-full bg-navy-secondary px-3 py-1 text-[11px] font-semibold text-white">
                        <Layers size={12} /> {active.category}
                      </span>
                    )}
                    {active.stageOfDevelopment && (
                      <span className="flex items-center gap-1 rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold text-orange">
                        <Rocket size={12} /> {active.stageOfDevelopment}
                      </span>
                    )}
                  </div>
                </div>

                {active.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{active.description}</p>}

                <dl className="mt-5 space-y-1.5 text-sm">
                  {active.founderNames && (
                    <div className="flex gap-2">
                      <dt className="flex shrink-0 items-center gap-1 text-slate-400">
                        <Users size={13} /> {t('innovationShowcaseConfirmed.detail.founders', 'Founders')}
                      </dt>
                      <dd className="text-navy">{active.founderNames}</dd>
                    </div>
                  )}
                  {active.trl && (
                    <div className="flex gap-2">
                      <dt className="text-slate-400">{t('innovationShowcaseConfirmed.detail.trl', 'TRL')}</dt>
                      <dd className="text-navy">{active.trl}</dd>
                    </div>
                  )}
                </dl>

                {active.solutionDescription && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {active.solutionName || t('innovationShowcaseConfirmed.detail.theSolution', 'The Solution')}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{active.solutionDescription}</p>
                  </div>
                )}

                {active.problemAddressed && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('innovationShowcaseConfirmed.detail.theProblem', 'The Problem')}</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{active.problemAddressed}</p>
                  </div>
                )}

                {active.aiTechnologies && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('innovationShowcaseConfirmed.detail.aiTechnologies', 'AI / ML Technologies')}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{active.aiTechnologies}</p>
                  </div>
                )}

                {active.uniqueValue && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('innovationShowcaseConfirmed.detail.uniqueValue', 'What Makes It Unique')}</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{active.uniqueValue}</p>
                  </div>
                )}

                {active.website && (
                  <a
                    href={active.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover"
                  >
                    <Globe2 size={15} /> {t('common.visitWebsite', 'Visit website')}
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
