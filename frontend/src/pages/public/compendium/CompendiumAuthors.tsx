import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, formatSurnameFirst } from './shared';
import { CompendiumSectionHeader } from './CompendiumSectionHeader';
import { CompendiumTable } from './CompendiumTable';
import { useCompendiumData } from './useCompendiumData';

export const CompendiumAuthors = () => {
  const { loading, error, edition, abstracts } = useCompendiumData();

  const rows = useMemo(() => {
    const list: { surnameFirst: string; code: string; title: string; role: string }[] = [];
    for (const a of abstracts) {
      if (a.status !== 'published') continue;
      for (const author of a.authors ?? []) {
        list.push({
          surnameFirst: formatSurnameFirst(author.name),
          code: a.code,
          title: a.title,
          role: author.isPresenting ? 'Presenting author' : 'Co-author',
        });
      }
    }
    return list.sort((x, y) => x.surnameFirst.localeCompare(y.surnameFirst) || x.code.localeCompare(y.code));
  }, [abstracts]);

  if (loading) return <CompendiumLoading label="Loading authors…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;

  return (
    <>
      <SEO title="Author Index" description="Index of authors in the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/authors" />
      <CompendiumSubnav />
      <CompendiumSectionHeader eyebrow="Annex A" title="Author index" dek="Every author, the abstract they contributed to, and their role." seed="authors" />

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="mb-4 text-sm text-compendium-ink/60">
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-compendium-ink/60">No abstracts have been published yet.</p>
          ) : (
            <CompendiumTable
              columns={['Author', 'Abstract', 'Role']}
              rows={rows.map((r) => [
                r.surnameFirst,
                <Link key={r.code} to={`/compendium/${r.code}`} className="font-medium text-orange hover:underline">
                  {r.code}
                </Link>,
                r.role,
              ])}
            />
          )}
        </div>
      </section>
    </>
  );
};
