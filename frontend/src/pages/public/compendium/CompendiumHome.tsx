import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import MiniSearch from 'minisearch';
import { SEO } from '../../../components/seo/SEO';
import logo from '../../../assets/AI_Logo_New_white.png';
import { fetchCompendiumSearchIndexRaw } from '../../../services/compendium.service';
import { trackEvent } from '../../../lib/analytics';
import { citeEdition, citeUrlForEdition } from '../../../lib/citation';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT, PresenterPhoto, FALLBACK_EDITION_TITLE } from './shared';
import { CompendiumMosaicBanner } from './CompendiumMosaicBanner';
import { useCompendiumData } from './useCompendiumData';

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
  poster: 'bg-compendium-olive/10 text-compendium-olive',
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
    // Fires once per successful landing on /compendium — edition only
    // changes if the admin publishes a new compendium edition, not per render.
    if (!edition) return;
    void trackEvent('compendium_open', { abstractCount: published.length });
  }, [edition, published.length]);

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

  const title = edition.editionTitle ?? FALLBACK_EDITION_TITLE;

  return (
    <>
      <SEO
        title="Open Access Compendium"
        description="The open-access compendium of abstracts from the AI in Health Summit 2026 — browse, search, and cite accepted abstracts."
        path="/compendium"
      />

      <section className="relative overflow-hidden bg-compendium-ink pb-0 pt-10 sm:pt-14">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <img src={logo} alt="The Artificial Intelligence in Health Summit 2026" className="h-10 w-auto" />
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.25em] text-orange">Open Access Compendium</p>
          <h1 className="mt-3 font-compendium-serif text-4xl font-bold leading-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl font-compendium-serif text-lg italic text-white/65">
            Abstracts accepted for presentation at the AI in Health Summit 2026 — free to read, search, and cite.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <StatPill label="Abstracts" value={published.length} />
            <StatPill label="Oral" value={oralCount} />
            <StatPill label="Poster" value={posterCount} />
            <StatPill label="Tracks" value={tracks.length} />
          </div>
        </div>
        <div className="relative mt-10 h-[90px] w-full sm:h-[110px]">
          <CompendiumMosaicBanner seed="cover" />
        </div>
      </section>

      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-compendium-ink/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-compendium-ink/60">{citeEdition(edition)}</p>
            <a
              href={citeUrlForEdition(edition)}
              className="shrink-0 self-start border border-compendium-ink/15 px-3.5 py-1.5 text-xs font-semibold text-compendium-ink hover:border-orange sm:self-auto"
            >
              {edition.licence.name}
              {!edition.licence.confirmed && <span className="text-compendium-ink/40">{LICENCE_CAVEAT}</span>}
            </a>
          </div>
          {edition.pdfUrl && (
            <a href={edition.pdfUrl} className="mt-4 inline-block bg-compendium-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange">
              Download PDF
            </a>
          )}

          <div className="mt-8 border border-compendium-ink/10 bg-compendium-cream/60 p-5 sm:p-6" role="search">
            <label htmlFor="compendium-search" className="mb-1.5 block text-sm font-semibold text-compendium-ink">
              Search abstracts
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-compendium-ink/40" />
              <input
                id="compendium-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, or keyword…"
                className="w-full border border-compendium-ink/15 bg-white py-3 pl-11 pr-4 text-base text-compendium-ink placeholder:text-compendium-ink/40 focus:outline-none focus:ring-2 focus:ring-orange/40 sm:text-sm"
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FilterSelect label="Track" value={track} onChange={setTrack} options={tracks} />
              <FilterSelect label="Presentation type" value={presentationType} onChange={setPresentationType} options={presentationTypes} />
              <FilterSelect label="Keyword" value={keyword} onChange={setKeyword} options={keywords} />
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-compendium-ink/60" aria-live="polite">
            {published.length === 0
              ? 'No abstracts have been published yet. Check back soon.'
              : `${filtered.length} abstract${filtered.length === 1 ? '' : 's'} found`}
          </p>

          <ul className="mt-4 space-y-3">
            {filtered.map((a, i) => (
              <li key={a.code}>
                <Link
                  to={`/compendium/${a.code}`}
                  className="flex items-start gap-4 border border-compendium-ink/10 p-5 transition-colors hover:border-orange"
                >
                  <span className="shrink-0 font-compendium-serif text-sm font-bold text-orange">{String(i + 1).padStart(2, '0')}</span>
                  <PresenterPhoto
                    photoUrl={a.photoUrl}
                    name={a.authors?.[0]?.name ?? a.title}
                    className="h-14 w-14 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="font-compendium-serif text-lg font-bold leading-snug text-compendium-ink">{a.title}</p>
                    {a.authors && a.authors.length > 0 && (
                      <p className="mt-1 text-sm text-compendium-ink/60">{a.authors.map((au) => au.name).join(', ')}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      {a.track && <span className="bg-compendium-cream px-2.5 py-1 text-compendium-ink/60">{a.track}</span>}
                      {a.presentationType && (
                        <span className={`px-2.5 py-1 ${TYPE_BADGE[a.presentationType] ?? 'bg-compendium-cream text-compendium-ink/60'}`}>
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
            <p className="mt-10 text-xs text-compendium-ink/50">
              Some abstracts include corrections recorded after publication — see each abstract's page for details.
            </p>
          )}
        </div>
      </section>
    </>
  );
};

const StatPill = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center gap-1.5 border border-white/15 bg-white/5 px-4 py-1.5">
    <span className="font-compendium-serif text-sm font-bold text-white">{value}</span>
    <span className="text-xs font-medium text-white/50">{label}</span>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-compendium-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-compendium-ink/15 bg-white px-4 py-2.5 text-sm text-compendium-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
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
