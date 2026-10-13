import { describe, it, expect } from 'vitest';
import { splitStructuredAbstract } from './structuredAbstract';

describe('splitStructuredAbstract', () => {
  it('returns a single unlabeled paragraph for plain, unstructured text', () => {
    expect(splitStructuredAbstract('Just a plain abstract with no section labels at all.')).toEqual([
      { label: null, body: 'Just a plain abstract with no section labels at all.' },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(splitStructuredAbstract('   ')).toEqual([]);
  });

  it('splits a real IMRaD-style abstract into labeled paragraphs', () => {
    const text =
      'BACKGROUND: Tuberculosis remains a leading cause of death. METHODS: We trained a CNN on 45,000 images. ' +
      'RESULTS: The model reached 94% sensitivity. CONCLUSION: AI-assisted microscopy can improve TB diagnosis.';
    expect(splitStructuredAbstract(text)).toEqual([
      { label: 'BACKGROUND', body: 'Tuberculosis remains a leading cause of death.' },
      { label: 'METHODS', body: 'We trained a CNN on 45,000 images.' },
      { label: 'RESULTS', body: 'The model reached 94% sensitivity.' },
      { label: 'CONCLUSION', body: 'AI-assisted microscopy can improve TB diagnosis.' },
    ]);
  });

  it('keeps unlabeled text before the first recognized label as its own paragraph', () => {
    const text = 'A short framing sentence with no label. BACKGROUND: The real background text.';
    expect(splitStructuredAbstract(text)).toEqual([
      { label: null, body: 'A short framing sentence with no label.' },
      { label: 'BACKGROUND', body: 'The real background text.' },
    ]);
  });

  it('prefers the longer multi-word label over a shorter one it contains', () => {
    const text = 'MATERIALS AND METHODS: We used a cross-sectional design.';
    expect(splitStructuredAbstract(text)).toEqual([{ label: 'MATERIALS AND METHODS', body: 'We used a cross-sectional design.' }]);
  });

  it('handles singular/plural label variants (OBJECTIVE vs OBJECTIVES)', () => {
    expect(splitStructuredAbstract('OBJECTIVE: To assess feasibility.')).toEqual([
      { label: 'OBJECTIVE', body: 'To assess feasibility.' },
    ]);
    expect(splitStructuredAbstract('OBJECTIVES: To assess feasibility.')).toEqual([
      { label: 'OBJECTIVES', body: 'To assess feasibility.' },
    ]);
  });

  it('drops an empty trailing section rather than emitting a blank paragraph', () => {
    expect(splitStructuredAbstract('BACKGROUND: Some text. CONCLUSION:')).toEqual([
      { label: 'BACKGROUND', body: 'Some text.' },
    ]);
  });
});
