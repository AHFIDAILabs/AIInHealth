import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../../../components/seo/SEO';
import { NotFound } from '../NotFound';
import { citeApa, citeBibtex, citeRis, buildScholarlyArticleJsonLd } from '../../../lib/citation';
import { sanitizeAbstractHtml } from '../../../lib/sanitizeAbstractHtml';
import { splitStructuredAbstract } from '../../../lib/structuredAbstract';
import { CompendiumSubnav, CompendiumLoading, CompendiumError, LICENCE_CAVEAT, PresenterPhoto, slugify } from './shared';
import { CompendiumMosaicBanner } from './CompendiumMosaicBanner';
import { useCompendiumData } from './useCompendiumData';
import { trackEvent } from '../../../lib/analytics';

type CiteFormat = 'apa' | 'bibtex' | 'ris';

export const CompendiumAbstract = () => {
  const { code } = useParams<{ code: string }>();
  const { loading, error, edition, abstracts } = useCompendiumData();
  const [citeFormat, setCiteFormat] = useState<CiteFormat>('apa');
  const [copied, setCopied] = useState(false);

  const index = abstracts.findIndex((a) => a.code === code);
  const record = index >= 0 ? abstracts[index] : null;

  const published = useMemo(() => abstracts.filter((a) => a.status === 'published'), [abstracts]);
  const publishedPosition = record ? published.findIndex((a) => a.code === record.code) : -1;

  const citations = useMemo(() => {
    if (!record || !edition) return null;
    return { apa: citeApa(record, edition), bibtex: citeBibtex(record, edition), ris: citeRis(record, edition) };
  }, [record, edition]);

  useEffect(() => {
    if (!record) return;
    void trackEvent('abstract_view', { code: record.code, presentationType: record.presentationType });
  }, [record]);

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
            <p className="text-xs font-semibold uppercase tracking-widest text-compendium-ink/40">{record.code}</p>
            <h1 className="mt-2 font-compendium-serif text-2xl font-bold text-compendium-ink">{record.title}</h1>
            <p className="mt-4 border border-compendium-ink/10 bg-compendium-cream px-4 py-3 text-sm font-medium text-compendium-ink/70">
              This abstract has been withdrawn.
            </p>
            <AbstractPager prev={prev} next={next} />
          </div>
        </section>
      </>
    );
  }

  const presentationLabel = record.presentationType === 'poster' ? 'PA' : 'OA';
  const bigNumber = publishedPosition >= 0 ? String(publishedPosition + 1).padStart(2, '0') : '—';
  const correspondingAuthor = record.authors?.find((a) => a.isCorresponding) ?? null;

  return (
    <>
      <SEO
        title={record.title}
        description={`${record.title} — AI in Health Summit 2026 Compendium of Abstracts.`}
        path={`/compendium/${record.code}`}
        structuredData={buildScholarlyArticleJsonLd(record, edition)}
      />
      <CompendiumSubnav />

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="flex flex-col border border-compendium-ink/10 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-center bg-orange px-6 py-6 text-white sm:w-[120px]">
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{presentationLabel}</span>
            <span className="font-compendium-serif text-4xl font-bold leading-none">{bigNumber}</span>
          </div>
          <div className="flex-1 bg-compendium-ink px-6 py-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">
              Abstract {record.code}
              {record.track && <> · {record.track}</>}
            </p>
            <h1 className="mt-2 font-compendium-serif text-xl font-bold leading-tight sm:text-2xl">{record.title}</h1>
            {record.track && <p className="mt-1.5 font-compendium-serif text-sm italic text-white/60">{record.track}</p>}
          </div>
        </div>
      </div>

      <section className="bg-white pb-16 pt-8 sm:pb-20">
        <article className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-[220px_1fr] sm:gap-10">
            <aside className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden border border-compendium-ink/10">
                  <CompendiumMosaicBanner seed={record.code} tiles={1} />
                </div>
                <PresenterPhoto
                  photoUrl={record.photoUrl}
                  name={record.authors?.[0]?.name ?? record.title}
                  className="h-11 w-11 shrink-0 rounded-full"
                />
              </div>

              {record.authors && record.authors.length > 0 && (
                <ul className="space-y-1 border-t border-compendium-ink/10 pt-3 text-[14px] text-compendium-ink">
                  {record.authors.map((a, i) => (
                    <li key={`${a.name}-${i}`}>
                      <span className={a.isPresenting ? 'font-semibold text-compendium-ink underline decoration-orange' : 'text-compendium-ink'}>
                        {a.name}
                      </span>
                      {a.affiliation && <span className="block text-xs text-compendium-ink/55">{a.affiliation}</span>}
                    </li>
                  ))}
                </ul>
              )}

              {record.studyType && (
                <div className="border-t border-compendium-ink/10 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">Study type</p>
                  <p className="mt-1 text-compendium-ink/80">{record.studyType}</p>
                </div>
              )}

              {record.setting && (
                <div className="border-t border-compendium-ink/10 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">Setting</p>
                  <p className="mt-1 text-compendium-ink/80">{record.setting}</p>
                </div>
              )}

              {record.keywords && record.keywords.length > 0 && (
                <div className="border-t border-compendium-ink/10 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">Keywords</p>
                  <ul className="mt-1 space-y-0.5">
                    {record.keywords.map((k) => (
                      <li key={k}>
                        <Link to={`/compendium/keywords#kw-${slugify(k)}`} className="text-compendium-ink/80 hover:text-orange hover:underline">
                          ◦ {k}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {correspondingAuthor && (
                <div className="border-t border-compendium-ink/10 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">Correspondence</p>
                  <p className="mt-1 text-compendium-ink/80">
                    {correspondingAuthor.name} ·{' '}
                    <Link to={`/contact?abstract=${record.code}`} className="text-orange hover:underline">
                      contact
                    </Link>
                  </p>
                </div>
              )}

              {citations && (
                <div className="border-t border-compendium-ink/10 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">Cite as</p>
                  <p className="mt-1 text-xs leading-relaxed text-compendium-ink/70">{citations.apa}</p>
                </div>
              )}
            </aside>

            <div className="min-w-0">
              {record.abstract && (
                <div className="max-w-none text-[16px] leading-[1.7] text-compendium-ink">
                  {splitStructuredAbstract(record.abstract).map((para, i) => (
                    <p key={i} className={`text-justify [text-justify:inter-word] ${i > 0 ? 'mt-5' : ''}`}>
                      {para.label && <strong className="mr-1.5 font-bold text-orange">{para.label}.</strong>}
                      {/* Already sanitized at export time AND again here (see
                          sanitizeAbstractHtml.ts) — only an exact i/b/sub/sup
                          markup can ever survive to reach this point. */}
                      <span dangerouslySetInnerHTML={{ __html: sanitizeAbstractHtml(para.body) }} />
                    </p>
                  ))}
                </div>
              )}

              {citations && (
                <div className="mt-10 border border-compendium-ink/10 p-5 sm:p-6">
                  <h2 className="font-compendium-serif text-base font-bold text-compendium-ink">Cite this abstract</h2>
                  <div className="print:hidden mt-3 flex flex-wrap gap-2">
                    {(['apa', 'bibtex', 'ris'] as CiteFormat[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCiteFormat(f)}
                        aria-pressed={citeFormat === f}
                        className={`px-3 py-1 text-xs font-semibold uppercase ${
                          citeFormat === f ? 'bg-compendium-ink text-white' : 'border border-compendium-ink/20 text-compendium-ink hover:border-compendium-ink'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap break-words bg-compendium-cream p-3.5 text-xs text-compendium-ink/80">
                    {citations[citeFormat]}
                  </pre>
                  <button
                    type="button"
                    className="print:hidden mt-2 text-xs font-semibold text-orange hover:underline"
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

              <p className="mt-6 text-xs text-compendium-ink/60">
                Licensed under {edition.licence.name}
                {!edition.licence.confirmed && LICENCE_CAVEAT}.{' '}
                <a href={edition.licence.url} className="font-medium text-orange hover:underline">
                  View licence
                </a>
              </p>

              {record.corrections && record.corrections.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-compendium-serif text-base font-bold text-compendium-ink">Corrections</h2>
                  <ul className="mt-2 space-y-2 text-sm text-compendium-ink/70">
                    {record.corrections.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium text-compendium-ink">
                          {new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}:
                        </span>{' '}
                        {c.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-8 text-sm text-compendium-ink/70">
                Found an error, or are you this abstract's corresponding author?{' '}
                <Link to={`/contact?abstract=${record.code}`} className="font-medium text-orange hover:underline">
                  Contact the secretariat
                </Link>
                .
              </p>

              <AbstractPager prev={prev} next={next} />
            </div>
          </div>
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
    <nav aria-label="Abstract navigation" className="print:hidden mt-10 flex items-center justify-between gap-4 border-t border-compendium-ink/10 pt-6 text-sm">
      {prev ? (
        <Link to={`/compendium/${prev.code}`} className="font-medium text-orange hover:underline">
          ← {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`/compendium/${next.code}`} className="font-medium text-orange hover:underline">
          {next.title} →
        </Link>
      )}
    </nav>
  );
};
