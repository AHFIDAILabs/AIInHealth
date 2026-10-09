import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { NotFound } from '../NotFound';
import { citeApa, citeBibtex, citeRis, buildScholarlyArticleJsonLd } from '../../../lib/citation';
import { sanitizeAbstractHtml } from '../../../lib/sanitizeAbstractHtml';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT, slugify } from './shared';
import { useCompendiumData } from './useCompendiumData';

type CiteFormat = 'apa' | 'bibtex' | 'ris';

export const CompendiumAbstract = () => {
  const { code } = useParams<{ code: string }>();
  const { loading, error, edition, abstracts } = useCompendiumData();
  const [citeFormat, setCiteFormat] = useState<CiteFormat>('apa');
  const [copied, setCopied] = useState(false);

  const index = abstracts.findIndex((a) => a.code === code);
  const record = index >= 0 ? abstracts[index] : null;

  const citations = useMemo(() => {
    if (!record || !edition) return null;
    return { apa: citeApa(record, edition), bibtex: citeBibtex(record, edition), ris: citeRis(record, edition) };
  }, [record, edition]);

  if (loading) return <CompendiumLoading label="Loading abstract…" />;
  if (error || !edition) return <CompendiumError message={error ?? 'The compendium could not be loaded.'} />;
  if (!record) return <NotFound />;

  const prev = index > 0 ? abstracts[index - 1] : null;
  const next = index < abstracts.length - 1 ? abstracts[index + 1] : null;

  if (record.status === 'withdrawn') {
    return (
      <>
        <SEO title={record.title} description={`${record.title} — withdrawn from the compendium.`} path={`/compendium/${record.code}`} noindex />
        <CompendiumSubnav />
        <section className="bg-white py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{record.code}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-navy">{record.title}</h1>
            <p className="mt-4 rounded-lg border border-slate-200 bg-offwhite px-4 py-3 text-sm font-medium text-slate-600">
              This abstract has been withdrawn.
            </p>
            <AbstractPager prev={prev} next={next} />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO
        title={record.title}
        description={`${record.title} — AI in Health Summit 2026 Compendium of Abstracts.`}
        path={`/compendium/${record.code}`}
        structuredData={buildScholarlyArticleJsonLd(record, edition)}
      />
      <CompendiumSubnav />

      <section className="bg-white py-14 sm:py-16">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{record.code}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold leading-tight text-navy sm:text-3xl">{record.title}</h1>

          {record.authors && record.authors.length > 0 && (
            <ul className="mt-4 space-y-1 text-[15px] text-slate-700">
              {record.authors.map((a, i) => (
                <li key={`${a.name}-${i}`}>
                  <span className="font-medium text-navy">{a.name}</span>
                  {a.isCorresponding && <span className="ml-1.5 text-xs text-slate-500">(corresponding author)</span>}
                  {a.affiliation && <span className="text-slate-500"> — {a.affiliation}</span>}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {record.track && <span className="rounded-full bg-offwhite px-2.5 py-1">{record.track}</span>}
            {record.presentationType && <span className="rounded-full bg-offwhite px-2.5 py-1">{record.presentationType}</span>}
          </div>

          {record.abstract && (
            <div
              className="mt-8 max-w-none text-[17px] leading-[1.7] text-slate-800"
              // Already sanitized at export time AND again here (see
              // sanitizeAbstractHtml.ts) — only an exact i/b/sub/sup markup
              // can ever survive to reach this point.
              dangerouslySetInnerHTML={{ __html: sanitizeAbstractHtml(record.abstract) }}
            />
          )}

          {record.keywords && record.keywords.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {record.keywords.map((k) => (
                <Link
                  key={k}
                  to={`/compendium/keywords#kw-${slugify(k)}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-navy hover:border-navy"
                >
                  {k}
                </Link>
              ))}
            </div>
          )}

          {record.sessionRef && (
            <p className="mt-6 text-sm text-slate-600">
              Session: <Link to="/agenda" className="font-medium text-navy hover:underline">{record.sessionRef}</Link>
            </p>
          )}

          {citations && (
            <div className="mt-10 rounded-2xl border border-slate-200 p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold text-navy">Cite this abstract</h2>
              <div className="print:hidden mt-3 flex flex-wrap gap-2">
                {(['apa', 'bibtex', 'ris'] as CiteFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCiteFormat(f)}
                    aria-pressed={citeFormat === f}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                      citeFormat === f ? 'bg-navy text-white' : 'border border-slate-200 text-navy hover:border-navy'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-offwhite p-3.5 text-xs text-slate-700">
                {citations[citeFormat]}
              </pre>
              <button
                type="button"
                className="print:hidden mt-2 text-xs font-semibold text-navy hover:underline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(citations[citeFormat]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // Clipboard access can be denied by the browser — the
                    // citation text is already selectable/visible either way.
                  }
                }}
              >
                {copied ? 'Copied!' : 'Copy citation'}
              </button>
            </div>
          )}

          <p className="mt-6 text-xs text-slate-500">
            Licensed under {edition.licence.name}
            {!edition.licence.confirmed && LICENCE_CAVEAT}.{' '}
            <a href={edition.licence.url} className="font-medium text-navy hover:underline">
              View licence
            </a>
          </p>

          {record.corrections && record.corrections.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-base font-semibold text-navy">Corrections</h2>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {record.corrections.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium text-navy">{new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:</span>{' '}
                    {c.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-8 text-sm text-slate-600">
            Found an error, or are you this abstract's corresponding author?{' '}
            <Link to={`/contact?abstract=${record.code}`} className="font-medium text-navy hover:underline">
              Contact the secretariat
            </Link>
            .
          </p>

          <AbstractPager prev={prev} next={next} />
        </article>
      </section>
    </>
  );
};

const AbstractPager = ({
  prev,
  next,
}: {
  prev: { code: string; title: string } | null;
  next: { code: string; title: string } | null;
}) => {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Abstract navigation" className="print:hidden mt-10 flex items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm">
      {prev ? (
        <Link to={`/compendium/${prev.code}`} className="font-medium text-navy hover:underline">
          ← {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`/compendium/${next.code}`} className="font-medium text-navy hover:underline">
          {next.title} →
        </Link>
      )}
    </nav>
  );
};
