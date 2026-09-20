import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, FileText, Mic, StickyNote } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { listConfirmedAbstracts, type ConfirmedAbstract } from '../../services/confirmedAbstract.service';
import { getApiErrorMessage } from '../../services/api';

const PRESENTATION_LABEL: Record<string, string> = { oral: 'Oral Presentation', poster: 'Poster Presentation' };

// A new, additive public page — the list of presenters the committee has
// actually confirmed, imported from their own tracker (see backend
// scripts/importConfirmedAbstracts.ts). Deliberately separate from
// AbstractSubmission.tsx (still the live "/abstracts/submit" form) — this
// only ever shows the safe subset of fields (see ConfirmedAbstract.model.ts):
// no author email, no visa/funding requests.
export const AbstractShowcase = () => {
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

  return (
    <>
      <PageHero
        eyebrow="Research & Abstracts"
        title="Confirmed Abstract Presentations"
        subtitle="The researchers and presenters confirmed for the Summit's oral and poster sessions."
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
                placeholder="Search by author or title..."
                className="w-full rounded-full border border-slate-200 bg-offwhite py-2.5 pl-10 pr-4 text-base sm:text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTracks.map((t) => (
                <button
                  key={t}
                  onClick={() => setTrack(t)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    track === t ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Reveal>

          {loading ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-offwhite" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Reveal className="mt-14 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              {abstracts.length === 0 ? (
                <>
                  <p className="font-display text-lg font-semibold text-navy">Confirmations coming soon</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    We&rsquo;re still finalizing the confirmed presenter list. Check back soon, or submit your own
                    abstract.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-navy">No presentations match your filters</p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setTrack('All');
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
              {filtered.map((abstract, i) => (
                <Reveal key={abstract._id} delay={i * 0.05}>
                  <button onClick={() => setActive(abstract)} className="group block h-full w-full text-left">
                    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                          {abstract.presentationType === 'poster' ? <StickyNote size={16} /> : <Mic size={16} />}
                        </span>
                        {abstract.track && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange">{abstract.track}</span>
                        )}
                      </div>
                      <p className="mt-4 font-display text-[15px] font-semibold leading-snug text-navy line-clamp-3">
                        {abstract.title}
                      </p>
                      <p className="mt-auto pt-4 text-sm text-slate-500">{abstract.authorName}</p>
                      {abstract.country && <p className="text-xs text-slate-400">{abstract.country}</p>}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Have research to share?</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">Submit Your Abstract</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Share your research with the Summit&rsquo;s Research &amp; Abstracts track.
            </p>
            <ButtonLink to="/abstracts/submit" variant="secondary" className="mt-6 !border-white/40 !bg-white/10">
              Submit an Abstract
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
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
            >
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                  <FileText size={20} />
                </span>
                <div>
                  {active.track && <span className="text-[10px] font-semibold uppercase tracking-wide text-orange">{active.track}</span>}
                  <p className="text-xs text-slate-400">
                    {active.presentationType ? PRESENTATION_LABEL[active.presentationType] : 'Presentation'} &middot;{' '}
                    {active.code}
                  </p>
                </div>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-navy">{active.title}</h3>
              <dl className="mt-5 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="text-slate-400">Presenter</dt>
                  <dd className="text-navy">{active.authorName}</dd>
                </div>
                {active.country && (
                  <div className="flex gap-2">
                    <dt className="text-slate-400">Country</dt>
                    <dd className="text-navy">{active.country}</dd>
                  </div>
                )}
              </dl>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
