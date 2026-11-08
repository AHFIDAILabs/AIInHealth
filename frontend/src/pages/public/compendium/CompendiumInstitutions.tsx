import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError } from './shared';
import { CompendiumSectionHeader } from './CompendiumSectionHeader';
import { CompendiumTable } from './CompendiumTable';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumInstitutions = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const rows = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const author of a.authors ?? []) {
        const affiliation = author.affiliation?.trim();
        if (!affiliation) continue;
        const list = map.get(affiliation) ?? [];
        if (!list.includes(a.code)) list.push(a.code);
        map.set(affiliation, list);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [abstracts]);

  if (loading) return <CompendiumLoading label="Loading institutions…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO
        title="Institution Index"
        description="Index of institutions represented in the AI in Health Summit 2026 Compendium of Abstracts."
        path="/compendium/institutions"
      />
      <CompendiumSubnav />
      <CompendiumSectionHeader eyebrow="Annex B" title="Institutional index" dek="Every institution represented, and the abstracts it appears on." seed="institutions" />

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="mb-4 text-sm text-compendium-ink/60">
            {rows.length} institution{rows.length === 1 ? '' : 's'}
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-compendium-ink/60">
              No author affiliations have been recorded for published abstracts yet.
            </p>
          ) : (
            <CompendiumTable
              columns={['Institution', 'Abstract']}
              rows={rows.map(([institution, codes]) => [
                institution,
                <Fragment key={institution}>
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
