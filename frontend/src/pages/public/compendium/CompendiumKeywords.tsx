import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError } from './shared';
import { CompendiumSectionHeader } from './CompendiumSectionHeader';
import { CompendiumTable } from './CompendiumTable';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumKeywords = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const rows = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const keyword of a.keywords ?? []) {
        const list = map.get(keyword) ?? [];
        list.push(a.code);
        map.set(keyword, list);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [abstracts]);

  if (loading) return <CompendiumLoading label="Loading keywords…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO title="Keyword Index" description="Index of keywords in the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/keywords" />
      <CompendiumSubnav />
      <CompendiumSectionHeader eyebrow="Annex C" title="Keyword index" dek="Every keyword, and the abstracts it appears in." seed="keywords" />

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="mb-4 text-sm text-compendium-ink/60">
            {rows.length} keyword{rows.length === 1 ? '' : 's'}
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-compendium-ink/60">No abstracts have been published yet.</p>
          ) : (
            <CompendiumTable
              columns={['Keyword', 'Abstract']}
              rows={rows.map(([keyword, codes]) => [
                keyword,
                <Fragment key={keyword}>
                  {codes.map((code, i) => (
                    <Fragment key={code}>
                      {i > 0 && ', '}
                      <Link to={`/compendium/${code}`} className="font-medium text-orange hover:underline">
                        {code}
                      </Link>
                    </Fragment>
                  ))}
                </Fragment>,
              ])}
            />
          )}
        </div>
      </section>
    </>
  );
};
