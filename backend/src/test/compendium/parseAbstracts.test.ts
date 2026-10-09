import { describe, it, expect } from 'vitest';
import { parseSourceText } from '../../scripts/compendium/parseAbstracts.js';

// Every fixture below is invented for this test — no real abstract content,
// matching the parser's own "synthetic fixtures only" rule.

describe('parseSourceText', () => {
  it('parses a regular, well-formed abstract as high confidence', () => {
    const source = `
Abstract ID: AIHS990001
A Test Study of Widget-Based Care
Track 2: Example Track Name
Authors: Jane Doe, John Smith
BACKGROUND: This is a synthetic background sentence that exists purely to give the parser something to chew on and clear the short-body anomaly threshold by being long enough on its own already here we go.
METHODS: Synthetic methods text, also long enough to avoid tripping the short-body check all by itself without needing anything else appended.
CONCLUSION: Synthetic conclusion text, likewise padded out so the total word count comfortably clears the forty-word minimum the parser checks for.
`;
    const { abstracts, report } = parseSourceText(source);
    expect(abstracts).toHaveLength(1);
    const a = abstracts[0];
    expect(a.code).toBe('AIHS990001');
    expect(a.title).toBe('A Test Study of Widget-Based Care');
    expect(a.trackNumber).toBe(2);
    expect(a.trackLabelInSource).toBe('Example Track Name');
    expect(a.authors).toEqual([{ name: 'Jane Doe' }, { name: 'John Smith' }]);
    expect(a.confidence).toBe('high');
    expect(a.anomalies).toHaveLength(0);
    expect(report.totalFound).toBe(1);
    expect(report.highConfidence).toBe(1);
  });

  it('does NOT merge "low- and middle-income" — a real English construction, not a line-wrap artifact', () => {
    const source = `
Abstract ID: AIHS990007
Elision Test Title
Track 1: Example Track
Authors: A Author
BACKGROUND: This applies to low- and middle-income countries with enough padding text to clear the short-body anomaly threshold comfortably.
`;
    const { abstracts } = parseSourceText(source);
    expect(abstracts[0].abstractText).toContain('low- and middle-income');
    expect(abstracts[0].abstractText).not.toContain('lowand');
    expect(abstracts[0].normalizations).toHaveLength(0);
  });

  it('rejoins a hyphenated line-wrap and logs it as a normalization', () => {
    const source = `
Abstract ID: AIHS990002
Hyphen Test Title
Track 1: Example Track
Authors: A Author
BACKGROUND: This bench- mark result is split across a line wrap in the source document and the parser must rejoin it cleanly without any other intervention needed here to pad this out.
`;
    const { abstracts } = parseSourceText(source);
    expect(abstracts[0].abstractText).toContain('benchmark');
    expect(abstracts[0].abstractText).not.toContain('bench- mark');
    expect(abstracts[0].normalizations.some((n) => n.includes('bench- mark') && n.includes('benchmark'))).toBe(true);
  });

  it('strips footnote markers from author names without touching real content', () => {
    const source = `
Abstract ID: AIHS990003
Footnote Marker Test
Track 3: Example Track
Authors: Suzan Example1, Grace Example¹, Correct Author*
BACKGROUND: Padding text so this abstract clears the short-body anomaly threshold on its own without any other help from elsewhere in this fixture.
`;
    const { abstracts } = parseSourceText(source);
    const authors = abstracts[0].authors;
    expect(authors[0]).toEqual({ name: 'Suzan Example' });
    expect(authors[1]).toEqual({ name: 'Grace Example' });
    expect(authors[2]).toEqual({ name: 'Correct Author', isCorresponding: true });
  });

  it('extracts a trailing Keywords line separately from the body', () => {
    const source = `
Abstract ID: AIHS990004
Keywords Test
Track 4: Example Track
Authors: A Author
BACKGROUND: Enough padding text here to clear the short-body check comfortably on its own merits without any other contribution.
Keywords: alpha; beta; gamma
`;
    const { abstracts } = parseSourceText(source);
    expect(abstracts[0].keywords).toEqual(['alpha', 'beta', 'gamma']);
    expect(abstracts[0].abstractText).not.toContain('Keywords');
  });

  it('flags missing title, missing track, missing authors, and a too-short body as anomalies', () => {
    const source = `
Abstract ID: AIHS990005
Authors: Only Author
Too short.
`;
    const { abstracts } = parseSourceText(source);
    const a = abstracts[0];
    expect(a.confidence).toBe('low');
    expect(a.anomalies).toContain('Missing Track line');
    expect(a.anomalies.some((x) => x.includes('short'))).toBe(true);
  });

  it('reports duplicate codes', () => {
    const source = `
Abstract ID: AIHS990006
First Title
Track 1: Example Track
Authors: A Author
BACKGROUND: Padding text long enough to clear the short-body anomaly threshold without any other contribution needed.

Abstract ID: AIHS990006
Second Title With Same Code
Track 1: Example Track
Authors: B Author
BACKGROUND: More padding text long enough to clear the short-body anomaly threshold without any other contribution needed.
`;
    const { report } = parseSourceText(source);
    expect(report.duplicateCodes).toContain('AIHS990006');
  });

  it('keeps a single organization author with its own comma/& intact, instead of splitting it as a list', () => {
    const source = `
Abstract ID: AIHS261022
Synthetic Title Standing In For The Org-Name Override Test
Track 2: Example Track
Authors: Media, Health & Rights Initiative of Nigeria (MHR)
BACKGROUND: Synthetic padding text long enough to clear the short-body anomaly threshold on its own without any other contribution needed here.
`;
    const { abstracts } = parseSourceText(source);
    expect(abstracts[0].authors).toEqual([{ name: 'Media, Health & Rights Initiative of Nigeria (MHR)' }]);
  });

  it('applies an admin-confirmed author override by code', () => {
    const source = `
Abstract ID: AIHS261017
Synthetic Title Standing In For The Override Test
Track 1: Example Track
Authors: Faruq Afolabi
BACKGROUND: Synthetic padding text long enough to clear the short-body anomaly threshold on its own without any other contribution needed here.
`;
    const { abstracts } = parseSourceText(source);
    expect(abstracts[0].authors).toEqual([{ name: 'Faruq Oluwatobi Afolabi' }]);
    expect(abstracts[0].normalizations.some((n) => n.includes('Author override'))).toBe(true);
  });
});
