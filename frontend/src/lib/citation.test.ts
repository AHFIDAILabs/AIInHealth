import { describe, it, expect } from 'vitest';
import { citeApa, citeBibtex, citeRis, citeUrl } from './citation';
import type { CompendiumAbstractRecord, CompendiumEdition } from '../services/compendium.service';

const baseEdition: CompendiumEdition = {
  editionTitle: null,
  editionYear: 2026,
  version: '1',
  publishedAt: null,
  publisher: null,
  licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', confirmed: false },
  doi: null,
  isbn: null,
  pdfUrl: null,
  editors: [],
  foreword: null,
  showPlainSummaries: false,
};

const baseRecord: CompendiumAbstractRecord = {
  code: 'TEST0001',
  title: 'A Synthetic Test Title',
  status: 'published',
  authors: [{ name: 'Jane Doe', affiliation: null, isCorresponding: null, orcid: null }],
  abstract: 'Synthetic body.',
  keywords: [],
  track: null,
  presentationType: null,
  sessionRef: null,
  language: 'en',
  corrections: [],
};

describe('citation formats', () => {
  it('never contains the literal string "undefined" in any format, with a fully-null edition', () => {
    expect(citeApa(baseRecord, baseEdition)).not.toContain('undefined');
    expect(citeBibtex(baseRecord, baseEdition)).not.toContain('undefined');
    expect(citeRis(baseRecord, baseEdition)).not.toContain('undefined');
  });

  it('never contains "undefined" even with no authors at all', () => {
    const noAuthors = { ...baseRecord, authors: [] };
    expect(citeApa(noAuthors, baseEdition)).not.toContain('undefined');
    expect(citeApa(noAuthors, baseEdition)).toContain('Unknown author');
    expect(citeBibtex(noAuthors, baseEdition)).not.toContain('undefined');
    expect(citeRis(noAuthors, baseEdition)).not.toContain('undefined');
  });

  it('uses the DOI as the citation URL when present, otherwise the page URL', () => {
    expect(citeUrl(baseRecord, baseEdition)).toBe('https://aiinhealthsummit.org/compendium/TEST0001');
    const withDoi = { ...baseEdition, doi: '10.1234/example' };
    expect(citeUrl(baseRecord, withDoi)).toBe('https://doi.org/10.1234/example');
  });

  it('falls back to a generic edition label when editionTitle is null, never printing "null"', () => {
    const apa = citeApa(baseRecord, baseEdition);
    expect(apa).not.toContain('null');
    expect(apa).toContain('AI in Health Summit 2026');
  });

  it('joins multiple authors correctly in each format', () => {
    const multi = { ...baseRecord, authors: [{ name: 'Jane Doe', affiliation: null, isCorresponding: null, orcid: null }, { name: 'John Smith', affiliation: null, isCorresponding: null, orcid: null }] };
    expect(citeApa(multi, baseEdition)).toContain('Jane Doe, John Smith');
    expect(citeBibtex(multi, baseEdition)).toContain('Jane Doe and John Smith');
    const ris = citeRis(multi, baseEdition);
    expect(ris).toContain('AU  - Jane Doe');
    expect(ris).toContain('AU  - John Smith');
  });

  it('BibTeX and RIS output is parseable-shaped (correct structural markers)', () => {
    const bibtex = citeBibtex(baseRecord, baseEdition);
    expect(bibtex.startsWith('@misc{TEST0001,')).toBe(true);
    expect(bibtex.endsWith('}')).toBe(true);
    const ris = citeRis(baseRecord, baseEdition);
    expect(ris.startsWith('TY  - ABST')).toBe(true);
    expect(ris.endsWith('ER  - ')).toBe(true);
  });
});
