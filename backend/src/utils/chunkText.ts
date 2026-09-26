// Splits raw extracted document text into KnowledgeChunk-sized pieces.
// Deterministic heuristics only — no Groq call, no reason to spend budget on
// what's fundamentally a text-layout problem, not a language-understanding
// one (same reasoning as utils/fetchPageText.ts's plain HTML-to-text strip).
// The output is a PROPOSAL: knowledgeChunk.controller.ts's adminExtract
// returns this for an admin to review/edit/deselect before anything is
// actually saved — see KnowledgeChunk.model.ts's own comment on why this
// codebase prefers admin-controlled chunk granularity over "upload a whole
// document and trust an automatic chunker" to begin with.

export interface ProposedChunk {
  sectionHeading?: string;
  text: string;
}

const TARGET_CHUNK_SIZE = 1200;
const MAX_CHUNK_SIZE = 2800; // stays under KnowledgeChunk.text's 3000-char maxlength with margin
const MIN_CHUNK_SIZE = 40; // drops near-empty fragments (stray page numbers, running headers)

const isHeadingLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true; // Markdown heading
  // ALL-CAPS short line — common for section titles once PDF/DOCX extraction
  // has stripped away the original font-size/bold styling that marked them.
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.split(/\s+/).length <= 10) return true;
  // "1. Introduction", "Section 2: Something"
  if (/^(\d+[.)]|\bSection\s+\d+\b)/i.test(trimmed) && trimmed.split(/\s+/).length <= 10) return true;
  return false;
};

const stripHeadingMarkup = (line: string): string => line.trim().replace(/^#{1,6}\s+/, '');

const splitLongParagraph = (para: string): string[] => {
  const sentences = para.split(/(?<=[.!?])\s+/);
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > MAX_CHUNK_SIZE) {
      pieces.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) pieces.push(current);
  return pieces;
};

export const chunkDocumentText = (rawText: string): ProposedChunk[] => {
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = normalized.split('\n');

  interface Section {
    heading?: string;
    paragraphs: string[];
  }
  const sections: Section[] = [{ paragraphs: [] }];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    const text = currentParagraph.join(' ').trim();
    if (text.length > 0) sections[sections.length - 1].paragraphs.push(text);
    currentParagraph = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    // Only treat a line as a heading at a paragraph boundary — a heading-shaped
    // line mid-sentence (rare, but possible with a stray all-caps acronym) stays
    // part of the paragraph it's already in.
    if (isHeadingLine(line) && currentParagraph.length === 0) {
      flushParagraph();
      sections.push({ heading: stripHeadingMarkup(line), paragraphs: [] });
      continue;
    }
    currentParagraph.push(line.trim());
  }
  flushParagraph();

  const chunks: ProposedChunk[] = [];
  for (const section of sections) {
    if (section.paragraphs.length === 0) continue;
    let current = '';
    for (const para of section.paragraphs) {
      const pieces = para.length > MAX_CHUNK_SIZE ? splitLongParagraph(para) : [para];
      for (const piece of pieces) {
        if (current && current.length + piece.length + 2 > TARGET_CHUNK_SIZE) {
          if (current.length >= MIN_CHUNK_SIZE) chunks.push({ sectionHeading: section.heading, text: current });
          current = piece;
        } else {
          current = current ? `${current}\n\n${piece}` : piece;
        }
      }
    }
    if (current.length >= MIN_CHUNK_SIZE) chunks.push({ sectionHeading: section.heading, text: current });
  }

  return chunks;
};
