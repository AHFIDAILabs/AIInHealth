import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { fetchCompendiumEdition, type CompendiumEdition } from '../../../services/compendium.service';
import { citeEdition } from '../../../lib/citation';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT } from './shared';

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

  return (
    <>
      <SEO title="About the Compendium" description="Licence, citation, and corrections policy for the AI in Health Summit 2026 Compendium of Abstracts." path="/compendium/about" />
      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <h1 className="font-display text-2xl font-semibold text-navy sm:text-3xl">About the Compendium</h1>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Open access</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This compendium collects abstracts accepted for presentation at the AI in Health Summit, published with
              each author's explicit consent. It is made freely available to read, download, and share — no
              registration, paywall, or account is required.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Licence</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Abstracts in this compendium are licensed under{' '}
              <a href={edition.licence.url} className="font-medium text-navy hover:underline">
                {edition.licence.name}
              </a>
              {!edition.licence.confirmed && <span className="text-slate-500">{LICENCE_CAVEAT}</span>}. You are free to
              share and adapt the material for any purpose, provided appropriate credit is given.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy">How to cite this compendium</h2>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-offwhite p-3.5 text-xs text-slate-700">
              {citeEdition(edition)}
            </pre>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              To cite an individual abstract, use the "Cite this abstract" tool on that abstract's own page.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Corrections and takedown requests</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If you are a corresponding author and need a correction made, or wish to have your abstract withdrawn
              from this compendium,{' '}
              <Link to="/contact" className="font-medium text-navy hover:underline">
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
