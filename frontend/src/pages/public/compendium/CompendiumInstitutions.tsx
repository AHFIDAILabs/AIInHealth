import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, slugify, groupByFirstLetter } from './shared';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumInstitutions = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const byInstitution = useMemo(() => {
    const map = new Map<string, { code: string; title: string }[]>();
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const author of a.authors ?? []) {
        const affiliation = author.affiliation?.trim();
        if (!affiliation) continue;
        const list = map.get(affiliation) ?? [];
        list.push({ code: a.code, title: a.title });
        map.set(affiliation, list);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [abstracts]);

  const grouped = useMemo(() => groupByFirstLetter(byInstitution), [byInstitution]);

  if (loading) return <CompendiumLoading label="Loading institutions…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO
        title="Institution Index"
        description="Alphabetical index of institutions represented in the AI in Health Summit 2026 Compendium of Abstracts."
        path="/compendium/institutions"
      />
      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">Institution Index</h1>
          <p className="mt-2 text-sm text-slate-600">
            {byInstitution.length} institution{byInstitution.length === 1 ? '' : 's'}
          </p>

          {byInstitution.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">
              No author affiliations have been recorded for published abstracts yet.
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              {grouped.map(([letter, entries]) => (
                <div key={letter}>
                  <h2 className="font-display text-sm font-bold uppercase tracking-widest text-orange">{letter}</h2>
                  <dl className="mt-4 space-y-6 border-t border-slate-100 pt-4">
                    {entries.map(([name, items]) => (
                      <div key={name} id={`in-${slugify(name)}`}>
                        <dt className="font-display text-base font-semibold text-navy">{name}</dt>
                        <dd className="mt-1.5 space-y-1">
                          {items.map((it) => (
                            <Link
                              key={it.code}
                              to={`/compendium/${it.code}`}
                              className="block text-sm text-slate-700 hover:text-navy hover:underline"
                            >
                              {it.title}
                            </Link>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
