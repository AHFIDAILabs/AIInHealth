import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Globe2, Sparkles, Users } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import {
  listInnovationShowcaseEntries,
  type InnovationShowcaseEntry,
} from '../../services/innovationShowcaseEntry.service';
import { getApiErrorMessage } from '../../services/api';

// A new, additive public page — the confirmed cohort of Innovation Showcase
// startups, imported from the judging tracker's own application data (see
// backend scripts/importInnovationShowcase.ts). Deliberately separate from
// InnovationShowcase.tsx (still the live "/innovation-showcase" admin-
// curated directory) — this page surfaces the richer application-form
// content (solution, problem, tech, TRL) that model never captured.
export const InnovationShowcaseConfirmed = () => {
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

  return (
    <>
      <PageHero
        eyebrow="Innovation Showcase"
        title="Confirmed Showcase Startups"
        subtitle="The health-AI startups confirmed to demo live at the Summit, selected through our judging process."
      />

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
                placeholder="Search startups..."
                className="w-full rounded-full border border-slate-200 bg-offwhite py-2.5 pl-10 pr-4 text-base sm:text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    category === c ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Reveal>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-offwhite" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              {entries.length === 0 ? (
                <>
                  <p className="font-display text-lg font-semibold text-navy">Confirmations coming soon</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    We&rsquo;re still finalizing the confirmed showcase cohort. Check back soon.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-navy">No startups match your filters</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setCategory('All');
                    }}
                    className="mt-3 text-sm font-semibold text-orange hover:text-orange-hover"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry, i) => (
                <Reveal key={entry._id} delay={i * 0.05}>
                  <button onClick={() => setActive(entry)} className="group block h-full w-full text-left">
                    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                      <div className="flex items-center gap-3">
                        {entry.logoUrl ? (
                          <img src={entry.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                            <Sparkles size={18} />
                          </span>
                        )}
                        {entry.category && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange">{entry.category}</span>
                        )}
                      </div>
                      <p className="mt-4 font-display text-[15px] font-semibold leading-snug text-navy">{entry.startupName}</p>
                      <p className="mt-1.5 text-sm leading-snug text-slate-500 line-clamp-3">
                        {entry.description ?? entry.solutionDescription}
                      </p>
                      {entry.country && <p className="mt-auto pt-4 text-xs text-slate-400">{entry.country}</p>}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Building in Health AI?</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">Showcase Your Innovation</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              We&rsquo;re curating a floor of the boldest African health-AI builders for future editions.
            </p>
            <ButtonLink to="/register" variant="secondary" className="mt-6 !border-white/40 !bg-white/10">
              Register Interest
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
              className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
            >
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                {active.logoUrl ? (
                  <img src={active.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                    <Sparkles size={20} />
                  </span>
                )}
                <div>
                  {active.category && <span className="text-[10px] font-semibold uppercase tracking-wide text-orange">{active.category}</span>}
                  <h3 className="font-display text-xl font-semibold text-navy">{active.startupName}</h3>
                </div>
              </div>

              {active.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{active.description}</p>}

              <dl className="mt-5 space-y-1.5 text-sm">
                {active.founderNames && (
                  <div className="flex gap-2">
                    <dt className="flex shrink-0 items-center gap-1 text-slate-400">
                      <Users size={13} /> Founders
                    </dt>
                    <dd className="text-navy">{active.founderNames}</dd>
                  </div>
                )}
                {active.country && (
                  <div className="flex gap-2">
                    <dt className="text-slate-400">Country</dt>
                    <dd className="text-navy">{active.country}</dd>
                  </div>
                )}
                {active.stageOfDevelopment && (
                  <div className="flex gap-2">
                    <dt className="text-slate-400">Stage</dt>
                    <dd className="text-navy">{active.stageOfDevelopment}</dd>
                  </div>
                )}
                {active.trl && (
                  <div className="flex gap-2">
                    <dt className="text-slate-400">TRL</dt>
                    <dd className="text-navy">{active.trl}</dd>
                  </div>
                )}
              </dl>

              {active.solutionDescription && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {active.solutionName || 'The Solution'}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{active.solutionDescription}</p>
                </div>
              )}

              {active.problemAddressed && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">The Problem</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{active.problemAddressed}</p>
                </div>
              )}

              {active.aiTechnologies && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI / ML Technologies</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{active.aiTechnologies}</p>
                </div>
              )}

              {active.uniqueValue && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What Makes It Unique</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{active.uniqueValue}</p>
                </div>
              )}

              {active.website && (
                <a
                  href={active.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover"
                >
                  <Globe2 size={15} /> Visit website
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
