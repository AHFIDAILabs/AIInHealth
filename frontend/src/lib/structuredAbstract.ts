// Splits a structured-abstract's plain text into paragraphs at its own
// section labels (BACKGROUND/METHODS/RESULTS/CONCLUSION and the like) — most
// submitted abstracts are written this way (the IMRaD convention) but arrive
// as one unbroken block of text with no paragraph breaks at all, since the
// submission form captures a single free-text field. Pure text-in,
// structure-out — rendering (and sanitizing each resulting body) is the
// caller's job.
const SECTION_LABELS = [
  'BACKGROUND',
  'INTRODUCTION',
  'RATIONALE',
  'PURPOSE',
  'OBJECTIVES?',
  'AIMS?',
  'MATERIALS AND METHODS',
  'METHODOLOGY',
  'METHODS?',
  'RESULTS?',
  'FINDINGS',
  'DISCUSSION',
  'CONCLUSION AND RECOMMENDATIONS',
  'CONCLUSIONS?',
  'RECOMMENDATIONS?',
  'IMPLICATIONS',
  'LIMITATIONS',
  'SIGNIFICANCE',
];

// \b anchors each alternative to the START of the matched word(s) — so at a
// given position in the text, only a label whose first word actually begins
// there can match (e.g. "METHODS?" never fires in the middle of "MATERIALS
// AND METHODS:", since that position isn't a word boundary start for it).
const SECTION_LABEL_RE = new RegExp(`\\b(${SECTION_LABELS.join('|')}):\\s*`, 'g');

export interface AbstractParagraph {
  /** The section label exactly as it appeared (e.g. "BACKGROUND"), or null for text before the first recognized label. */
  label: string | null;
  body: string;
}

export const splitStructuredAbstract = (text: string): AbstractParagraph[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const matches = Array.from(trimmed.matchAll(SECTION_LABEL_RE));
  if (matches.length === 0) return [{ label: null, body: trimmed }];

  const paragraphs: AbstractParagraph[] = [];
  const firstIndex = matches[0].index ?? 0;
  if (firstIndex > 0) {
    const intro = trimmed.slice(0, firstIndex).trim();
    if (intro) paragraphs.push({ label: null, body: intro });
  }

  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? trimmed.length : trimmed.length;
    const body = trimmed.slice(start, end).trim();
    if (body) paragraphs.push({ label: match[1], body });
  });

  return paragraphs;
};
