import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, slugify } from './shared';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumAuthors = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const byAuthor = useMemo(() => {
    const map = new Map<string, { code: string; title: string }[]>();
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const author of a.authors ?? []) {
        const list = map.get(author.name) ?? [];
        list.push({ code: a.code, title: a.title });
        map.set(author.name, list);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [abstracts]);

  if (loading) return <CompendiumLoading label="Loading authors…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO title="Author Index" description="Alphabetical index of authors in the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/authors" />
      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">Author Index</h1>
          <p className="mt-2 text-sm text-slate-600">{byAuthor.length} author{byAuthor.length === 1 ? '' : 's'}</p>

          {byAuthor.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No abstracts have been published yet.</p>
          ) : (
            <dl className="mt-8 space-y-6">
              {byAuthor.map(([name, items]) => (
                <div key={name} id={`au-${slugify(name)}`}>
                  <dt className="font-display text-base font-semibold text-navy">{name}</dt>
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
