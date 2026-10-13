import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import MiniSearch from 'minisearch';
import { SEO } from '../../../components/seo/SEO';
import { PageHero } from '../../../components/ui/PageHero';
import { fetchCompendiumSearchIndexRaw } from '../../../services/compendium.service';
import { citeEdition, citeUrlForEdition } from '../../../lib/citation';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT, PresenterPhoto } from './shared';
import { useCompendiumData } from './useCompendiumData';

const FALLBACK_TITLE = 'AI in Health Summit 2026 — Compendium of Abstracts';
const ALL = '__all__';

// Field/option shape must match backend/src/scripts/compendium/exportSnapshot.ts's
// buildSearchIndex() exactly — MiniSearch.loadJSON() needs the same config the
// index was built with, since not all of it round-trips through the JSON.
const MINISEARCH_OPTIONS = {
  fields: ['title', 'authors', 'keywords', 'abstract'],
  storeFields: ['title'],
  idField: 'id',
};

// Oral vs poster get a distinct colour so the list scans quickly at a
// glance — anything outside those two known values still renders, just
// without the colour cue.
const TYPE_BADGE: Record<string, string> = {
  oral: 'bg-orange/10 text-orange',
  poster: 'bg-chart-teal/10 text-chart-teal',
};

export const CompendiumHome = () => {
  const { loading, error, edition, current, abstracts } = useCompendiumData();
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState(ALL);
  const [presentationType, setPresentationType] = useState(ALL);
  const [keyword, setKeyword] = useState(ALL);
  const [mini, setMini] = useState<MiniSearch | null>(null);
  const [matchingCodes, setMatchingCodes] = useState<Set<string> | null>(null);

  const published = useMemo(() => abstracts.filter((a) => a.status === 'published'), [abstracts]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    fetchCompendiumSearchIndexRaw(current.version)
      .then((raw) => {
        if (!cancelled) setMini(MiniSearch.loadJSON(raw, MINISEARCH_OPTIONS));
      })
      .catch(() => {
        // Search is an enhancement on top of browsing/filtering — if the
        // index fails to load, the rest of the page still works.
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    if (!mini || !query.trim()) {
      setMatchingCodes(null);
      return;
    }
    const results = mini.search(query, { prefix: true, fuzzy: 0.2 });
    setMatchingCodes(new Set(results.map((r) => String(r.id))));
  }, [mini, query]);

  const tracks = useMemo(() => uniqueSorted(published.map((a) => a.track)), [published]);
  const presentationTypes = useMemo(() => uniqueSorted(published.map((a) => a.presentationType)), [published]);
  const keywords = useMemo(() => uniqueSorted(published.flatMap((a) => a.keywords ?? [])), [published]);
  const oralCount = useMemo(() => published.filter((a) => a.presentationType === 'oral').length, [published]);
  const posterCount = useMemo(() => published.filter((a) => a.presentationType === 'poster').length, [published]);

  const filtered = useMemo(() => {
    return published.filter((a) => {
      if (matchingCodes && !matchingCodes.has(a.code)) return false;
      if (track !== ALL && a.track !== track) return false;
      if (presentationType !== ALL && a.presentationType !== presentationType) return false;
      if (keyword !== ALL && !(a.keywords ?? []).includes(keyword)) return false;
      return true;
    });
  }, [published, matchingCodes, track, presentationType, keyword]);

  const hasCorrections = useMemo(() => abstracts.some((a) => (a.corrections?.length ?? 0) > 0), [abstracts]);

  if (loading) return <CompendiumLoading label="Loading the compendium…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  const title = edition.editionTitle ?? FALLBACK_TITLE;

  return (
    <>
      <SEO
        title="Open Access Compendium"
        description="The open-access compendium of abstracts from the AI in Health Summit 2026 — browse, search, and cite accepted abstracts."
        path="/compendium"
      />

      <PageHero
        eyebrow="Open Access"
        title={title}
        subtitle="Browse, search, and cite the abstracts accepted for presentation at the AI in Health Summit 2026 — free for researchers, students, and policymakers to read and reuse."
        documentTitle="Open Access Compendium"
      >
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <StatPill label="Abstracts" value={published.length} />
          <StatPill label="Oral" value={oralCount} />
          <StatPill label="Poster" value={posterCount} />
          <StatPill label="Tracks" value={tracks.length} />
        </div>
      </PageHero>

      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-slate-500">{citeEdition(edition)}</p>
            <a
              href={citeUrlForEdition(edition)}
              className="shrink-0 self-start rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-navy hover:border-navy sm:self-auto"
            >
              {edition.licence.name}
              {!edition.licence.confirmed && <span className="text-slate-400">{LICENCE_CAVEAT}</span>}
            </a>
          </div>
          {edition.pdfUrl && (
            <a
              href={edition.pdfUrl}
              className="mt-4 inline-block rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-secondary"
            >
              Download PDF
            </a>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-offwhite/60 p-5 sm:p-6" role="search">
            <label htmlFor="compendium-search" className="mb-1.5 block text-sm font-semibold text-navy">
              Search abstracts
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="compendium-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, or keyword…"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange/40 sm:text-sm"
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FilterSelect label="Track" value={track} onChange={setTrack} options={tracks} />
              <FilterSelect label="Presentation type" value={presentationType} onChange={setPresentationType} options={presentationTypes} />
              <FilterSelect label="Keyword" value={keyword} onChange={setKeyword} options={keywords} />
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-slate-500" aria-live="polite">
            {published.length === 0
              ? 'No abstracts have been published yet. Check back soon.'
              : `${filtered.length} abstract${filtered.length === 1 ? '' : 's'} found`}
          </p>

          <ul className="mt-4 space-y-3">
            {filtered.map((a) => (
              <li key={a.code}>
                <Link
                  to={`/compendium/${a.code}`}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-card-hover"
                >
                  <PresenterPhoto
                    photoUrl={a.photoUrl}
                    name={a.authors?.[0]?.name ?? a.title}
                    className="h-14 w-14 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-snug text-navy">{a.title}</p>
                    {a.authors && a.authors.length > 0 && (
                      <p className="mt-1 text-sm text-slate-600">{a.authors.map((au) => au.name).join(', ')}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      {a.track && <span className="rounded-full bg-offwhite px-2.5 py-1 text-slate-500">{a.track}</span>}
                      {a.presentationType && (
                        <span className={`rounded-full px-2.5 py-1 ${TYPE_BADGE[a.presentationType] ?? 'bg-offwhite text-slate-500'}`}>
                          {a.presentationType}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {hasCorrections && (
            <p className="mt-10 text-xs text-slate-500">
              Some abstracts include corrections recorded after publication — see each abstract's page for details.
            </p>
          )}
        </div>
      </section>
    </>
  );
};

const StatPill = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
    <span className="font-display text-sm font-bold text-white">{value}</span>
    <span className="text-xs font-medium text-slate-300">{label}</span>
  </div>
);

const uniqueSorted = (values: (string | null | undefined)[]): string[] =>
  Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => {
  const id = `compendium-filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
      >
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
};
