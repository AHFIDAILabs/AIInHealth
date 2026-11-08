import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { fetchCompendiumEdition, type CompendiumEdition } from '../../../services/compendium.service';
import { citeEdition } from '../../../lib/citation';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT, FALLBACK_EDITION_TITLE } from './shared';
import { CompendiumSectionHeader } from './CompendiumSectionHeader';
import { CompendiumTable } from './CompendiumTable';

export const CompendiumAbout = () => {
  const [edition, setEdition] = useState<CompendiumEdition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCompendiumEdition()
      .then((e) => {
        if (!cancelled) setEdition(e);
      })
      .catch(() => {
        if (!cancelled) setError('The compendium could not be loaded right now. Please try again shortly.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <CompendiumError message={error} />;
  if (!edition) return <CompendiumLoading label="Loading…" />;

  const particulars: [string, ReactNode][] = [
    ['Title', edition.editionTitle ?? FALLBACK_EDITION_TITLE],
    ['Publisher', edition.publisher],
    ['Editors', edition.editors.length > 0 ? edition.editors.join(', ') : null],
    [
      'DOI',
      edition.doi ? (
        <a href={`https://doi.org/${edition.doi}`} className="font-medium text-orange hover:underline">
          {edition.doi}
        </a>
      ) : null,
    ],
    ['ISBN', edition.isbn],
    ['Edition', edition.version],
    [
      'Date of issue',
      edition.publishedAt
        ? new Date(edition.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : null,
    ],
  ].filter(([, value]) => value) as [string, ReactNode][];

  return (
    <>
      <SEO title="About the Compendium" description="Licence, citation, and corrections policy for the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/about" />
      <CompendiumSubnav />
      <CompendiumSectionHeader eyebrow="Front Matter" title="About this compendium" dek="Publication particulars, licence, and how to cite." seed="about" />

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <div>
            <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">Publication particulars</h2>
            <div className="mt-3">
              <CompendiumTable columns={['Field', 'Detail']} rows={particulars.map(([label, value]) => [label, value])} />
            </div>
          </div>

          {edition.foreword && (
            <div>
              <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">Foreword</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-compendium-ink/75">{edition.foreword}</p>
            </div>
          )}

          <div>
            <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">Open access</h2>
            <p className="mt-2 text-sm leading-relaxed text-compendium-ink/75">
              This compendium collects abstracts accepted for presentation at the AI in Health Summit, published with
              each author's explicit consent. It is made freely available to read, download, and share — no
              registration, paywall, or account is required.
            </p>
          </div>

          <div>
            <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">Licence</h2>
            <p className="mt-2 text-sm leading-relaxed text-compendium-ink/75">
              Abstracts in this compendium are licensed under{' '}
              <a href={edition.licence.url} className="font-medium text-orange hover:underline">
                {edition.licence.name}
              </a>
              {!edition.licence.confirmed && <span className="text-compendium-ink/50">{LICENCE_CAVEAT}</span>}. You are free
              to share and adapt the material for any purpose, provided appropriate credit is given.
            </p>
          </div>

          <div>
            <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">How to cite this compendium</h2>
            <pre className="mt-2 whitespace-pre-wrap break-words border border-compendium-ink/10 bg-compendium-cream p-3.5 text-xs text-compendium-ink/80">
              {citeEdition(edition)}
            </pre>
            <p className="mt-2 text-sm leading-relaxed text-compendium-ink/75">
              To cite an individual abstract, use the "Cite this abstract" tool on that abstract's own page.
            </p>
          </div>

          <div>
            <h2 className="font-compendium-serif text-xl font-bold text-compendium-ink">Corrections and takedown requests</h2>
            <p className="mt-2 text-sm leading-relaxed text-compendium-ink/75">
              If you are a corresponding author and need a correction made, or wish to have your abstract withdrawn
              from this compendium,{' '}
              <Link to="/contact" className="font-medium text-orange hover:underline">
                contact the secretariat
              </Link>
              . Corrections already recorded for a given abstract are listed on that abstract's own page.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};
