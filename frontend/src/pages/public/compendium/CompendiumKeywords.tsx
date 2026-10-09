import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, slugify } from './shared';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumKeywords = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const byKeyword = useMemo(() => {
    const map = new Map<string, { code: string; title: string }[]>();
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const keyword of a.keywords ?? []) {
        const list = map.get(keyword) ?? [];
        list.push({ code: a.code, title: a.title });
        map.set(keyword, list);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [abstracts]);

  if (loading) return <CompendiumLoading label="Loading keywords…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO title="Keyword Index" description="Alphabetical index of keywords in the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/keywords" />
      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">Keyword Index</h1>
          <p className="mt-2 text-sm text-slate-600">{byKeyword.length} keyword{byKeyword.length === 1 ? '' : 's'}</p>

          {byKeyword.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No abstracts have been published yet.</p>
          ) : (
            <dl className="mt-8 space-y-6">
              {byKeyword.map(([keyword, items]) => (
                <div key={keyword} id={`kw-${slugify(keyword)}`}>
                  <dt className="font-display text-base font-semibold text-navy">{keyword}</dt>
                  <dd className="mt-1.5 space-y-1">
                    {items.map((it) => (
                      <Link key={it.code} to={`/compendium/${it.code}`} className="block text-sm text-slate-700 hover:text-navy hover:underline">
                        {it.title}
                      </Link>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </>
  );
};
