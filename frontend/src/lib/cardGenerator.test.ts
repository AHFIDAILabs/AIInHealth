import { describe, it, expect } from 'vitest';
import { wrapText, buildDetailLines, type EventCardData } from './cardGenerator';
import { EVENT_DATE_RANGE, VENUE_SHORT } from './siteInfo';

// A fixed-width-per-character stand-in for ctx.measureText(s).width — avoids
// depending on a real canvas 2D context (not available in jsdom without a
// native addon this project doesn't otherwise need), while still exercising
// the real wrapping logic against a predictable measure function.
const monospaceMeasure = (s: string) => s.length * 10;

describe('wrapText', () => {
  it('returns a single line when the text fits within maxWidth', () => {
    expect(wrapText('Jane Doe', 200, monospaceMeasure)).toEqual(['Jane Doe']);
  });

  it('wraps onto multiple lines once a word would exceed maxWidth', () => {
    const lines = wrapText('A Title Long Enough To Wrap Across Two Lines', 150, monospaceMeasure);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('A Title Long Enough To Wrap Across Two Lines');
  });

  it('never drops a word, even one wider than maxWidth on its own', () => {
    const lines = wrapText('Short Supercalifragilisticexpialidocious Word', 100, monospaceMeasure);
    expect(lines.join(' ')).toBe('Short Supercalifragilisticexpialidocious Word');
  });

  it('returns an empty array for blank input', () => {
    expect(wrapText('   ', 200, monospaceMeasure)).toEqual([]);
  });
});

describe('buildDetailLines', () => {
  it('shows the event date range and venue for an attending card', () => {
    const data: EventCardData = { kind: 'attending', name: 'Jane Doe' };
    expect(buildDetailLines(data)).toEqual([EVENT_DATE_RANGE, VENUE_SHORT]);
  });

  it('shows line1/line2 for a presenting card', () => {
    const data: EventCardData = {
      kind: 'presenting',
      name: 'Jane Doe',
      line1: 'AI-Assisted Triage in Primary Care',
      line2: 'Day 1 · 10:30–10:45 · Hall B',
    };
    expect(buildDetailLines(data)).toEqual(['AI-Assisted Triage in Primary Care', 'Day 1 · 10:30–10:45 · Hall B']);
  });

  it('shows line1/line2 for a speaking card', () => {
    const data: EventCardData = {
      kind: 'speaking',
      name: 'Dr. John Smith',
      line1: 'Panel: Scaling AI Diagnostics Across Africa',
      line2: 'Day 2 · 14:00–15:00 · Main Hall',
    };
    expect(buildDetailLines(data)).toEqual(['Panel: Scaling AI Diagnostics Across Africa', 'Day 2 · 14:00–15:00 · Main Hall']);
  });

  it('omits a missing line rather than rendering it as "undefined"', () => {
    const data: EventCardData = { kind: 'presenting', name: 'Jane Doe', line1: 'A Title' };
    expect(buildDetailLines(data)).toEqual(['A Title']);
  });
});
