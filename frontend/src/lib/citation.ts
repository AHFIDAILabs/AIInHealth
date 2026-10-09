import { SITE_URL } from './siteInfo';
import type { CompendiumAbstractRecord, CompendiumEdition } from '../services/compendium.service';

// Every format here must never emit the literal string "undefined" or a
// blank field — each piece has an explicit, sensible fallback. Author names
// are used exactly as stored (full "First Last" strings), never
// algorithmically reordered into "Last, F." — this dataset has too many real
// shapes (single names, multi-part surnames, organizations-as-author) for a
// name-splitting heuristic to ever be safe; a plain name list is correct far
// more often than a guessed reformatting would be.
const FALLBACK_EDITION_TITLE = 'AI in Health Summit 2026 — Compendium of Abstracts';

const authorList = (record: CompendiumAbstractRecord): string[] => {
  const names = (record.authors ?? []).map((a) => a.name).filter(Boolean);
  return names.length > 0 ? names : ['Unknown author'];
};

// Prefers the edition DOI when present (a real, resolvable, permanent
// identifier); falls back to this abstract's own page URL otherwise — never
// a blank or "undefined" citation target.
export const citeUrl = (record: CompendiumAbstractRecord, edition: CompendiumEdition): string =>
  edition.doi ? `https://doi.org/${edition.doi}` : `${SITE_URL}/compendium/${record.code}`;

export const citeApa = (record: CompendiumAbstractRecord, edition: CompendiumEdition): string => {
  const authors = authorList(record).join(', ');
  const editionLabel = edition.editionTitle ?? FALLBACK_EDITION_TITLE;
  return `${authors} (${edition.editionYear}). ${record.title}. In ${editionLabel} (${record.code}). ${citeUrl(record, edition)}`;
};

export const citeBibtex = (record: CompendiumAbstractRecord, edition: CompendiumEdition): string => {
  const authors = authorList(record).join(' and ');
  const editionLabel = edition.editionTitle ?? FALLBACK_EDITION_TITLE;
  const lines = [
    `@misc{${record.code},`,
    `  author = {${authors}},`,
    `  title = {${record.title}},`,
    `  year = {${edition.editionYear}},`,
    `  howpublished = {${editionLabel}},`,
    `  note = {${record.code}},`,
    `  url = {${citeUrl(record, edition)}}`,
    `}`,
  ];
  return lines.join('\n');
};

// Citing the compendium as a whole (the home/about pages), not one abstract.
export const citeUrlForEdition = (edition: CompendiumEdition): string =>
  edition.doi ? `https://doi.org/${edition.doi}` : `${SITE_URL}/compendium`;

export const citeEdition = (edition: CompendiumEdition): string => {
  const editors = edition.editors.length > 0 ? edition.editors.join(', ') : 'AI in Health Summit 2026 Organizing Committee';
  const editionLabel = edition.editionTitle ?? FALLBACK_EDITION_TITLE;
  const publisher = edition.publisher ? ` ${edition.publisher}.` : '';
  return `${editors} (Eds.). (${edition.editionYear}). ${editionLabel}.${publisher} ${citeUrlForEdition(edition)}`;
};

// schema.org structured data for an abstract page — read by both the live
// SEO component here AND (duplicated in plain JS, same precedent as
// sanitizeAbstractHtml.ts) scripts/prerender-compendium.mjs, so a crawler
// sees identical JSON-LD whether it executes JS or just reads the
// build-time snapshot.
export const buildScholarlyArticleJsonLd = (record: CompendiumAbstractRecord, edition: CompendiumEdition): object => ({
  '@context': 'https://schema.org',
  '@type': 'ScholarlyArticle',
  headline: record.title,
  author: authorList(record).map((name) => ({ '@type': 'Person', name })),
  ...(record.keywords && record.keywords.length > 0 ? { keywords: record.keywords.join(', ') } : {}),
  inLanguage: record.language ?? 'en',
  ...(edition.publishedAt ? { datePublished: edition.publishedAt } : {}),
  url: citeUrl(record, edition),
  isPartOf: {
    '@type': 'PublicationVolume',
    name: edition.editionTitle ?? FALLBACK_EDITION_TITLE,
  },
  license: edition.licence.url,
});

export const citeRis = (record: CompendiumAbstractRecord, edition: CompendiumEdition): string => {
  const lines = ['TY  - ABST'];
  for (const name of authorList(record)) lines.push(`AU  - ${name}`);
  lines.push(`TI  - ${record.title}`);
  lines.push(`PY  - ${edition.editionYear}`);
  lines.push(`ID  - ${record.code}`);
  lines.push(`UR  - ${citeUrl(record, edition)}`);
  lines.push('ER  - ');
  return lines.join('\n');
};
