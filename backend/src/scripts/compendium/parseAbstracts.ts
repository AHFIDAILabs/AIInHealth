/**
 * scripts/compendium/parseAbstracts.ts
 *
 * Phase 2 of the open-access compendium project — a deterministic (no AI)
 * parser over the committee's "Accepted Abstracts" document, already
 * extracted to plain text (see data/README.md for how that file gets here).
 * Writes compendium/import/parsed.json + parse-report.md — never the DB.
 *
 * Deliberately narrow about what counts as "normalization" (ground rule #7 —
 * authors' words are verbatim): only two mechanical fixes are ever applied
 * automatically, both logged per-abstract in the report:
 *   1. Collapsing incidental whitespace (line-wrap newlines → spaces).
 *   2. Rejoining a hyphenated line-wrap break ("bench- mark" -> "benchmark").
 * Anything that looks like a genuine extraction/typo artifact (a dropped
 * letter, an author's own grammar) is flagged as an anomaly for a human to
 * look at — never silently "fixed". Author name footnote markers (a bare
 * trailing digit or a unicode superscript, e.g. "Nakasendwa1"/"Nagya¹") are
 * stripped since they're pagination artifacts, not part of the name.
 *
 * Usage:
 *   npx tsx src/scripts/compendium/parseAbstracts.ts --file <path to .txt>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};
const DEFAULT_FILE = path.join(__dirname, 'data', 'accepted-abstracts-source.txt');
const sourcePath = path.resolve(getArg('file') ?? DEFAULT_FILE);

const IMPORT_DIR = path.join(__dirname, '..', '..', '..', 'compendium', 'import');

export interface ParsedAuthor {
  name: string;
  isCorresponding?: boolean;
}

export interface ParsedAbstract {
  code: string;
  title: string;
  trackNumber?: number;
  trackLabelInSource?: string;
  authors: ParsedAuthor[];
  rawAuthorsLine: string;
  abstractText: string;
  keywords: string[];
  confidence: 'high' | 'low';
  anomalies: string[];
  normalizations: string[];
}

export interface ParseReport {
  runAt: string;
  sourceFile: string;
  totalFound: number;
  highConfidence: number;
  lowConfidence: number;
  duplicateCodes: string[];
  needsManualAttention: { code: string; anomalies: string[] }[];
}

const CODE_HEADER_RE = /Abstract ID:\s*(AIHS\d+)/g;

// A few hand-confirmed corrections from the conversation reconciling this
// PDF against the live ConfirmedAbstract collection — applied AFTER parsing,
// not inferred. Each documents exactly what was decided and why, so a future
// re-run of this script against a corrected source document doesn't need to
// remember these by hand (and would simply stop finding anything to patch
// here once the source itself carries the fix).
const AUTHOR_OVERRIDES: Record<string, string> = {
  // The live DB (imported earlier from the committee's own tracker) has
  // "Faruq Oluwatobi" as the submitter's name; this PDF instead says "Faruq
  // Afolabi" for the same abstract (AIHS261017, confirmed same title). Admin
  // decision: both are real parts of the same person's name — combine them
  // rather than pick one and discard the other.
  AIHS261017: 'Faruq Oluwatobi Afolabi',
};

// Single-organization authors whose own official name contains a comma
// and/or an ampersand — the generic comma/semicolon/& splitter above has no
// way to distinguish "one org name that happens to contain these
// characters" from "a genuine multi-author list", so these need an explicit
// override rather than a general parsing rule. (AIHS261039's two-institution
// split is NOT one of these — "Isuna Technologies" and "National Primary
// HealthCare Development Agency" are confirmed as two separate collaborating
// organizations by the abstract's own body text, so the generic comma-split
// there is correct and left alone.)
const SINGLE_ENTITY_AUTHOR_OVERRIDES: Record<string, string> = {
  AIHS261022: 'Media, Health & Rights Initiative of Nigeria (MHR)',
};

const normalizeWhitespace = (text: string): string => text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

// Rejoins a hyphenated line-wrap break — "bench- mark" -> "benchmark". Logged
// per occurrence (returned alongside the fixed text) rather than applied
// silently, since the only other explanation for this exact shape (letter,
// hyphen, space, lowercase letter) is a genuinely hyphenated compound word
// that happens to have wrapped right at the hyphen — rare, but a human
// should see every instance, not just trust the regex.
// A trailing hyphen followed by "and"/"or" is never a line-wrap break in this
// corpus — it's the standard English elision construction ("low- and
// middle-income countries" = "low-income and middle-income countries" with
// the shared suffix dropped from the first half). Merging it would corrupt
// real prose, not fix an artifact, so it's excluded outright rather than
// merged-then-flagged.
const ELISION_CONJUNCTIONS = new Set(['and', 'or']);

const dehyphenate = (text: string): { text: string; hits: string[] } => {
  const hits: string[] = [];
  // Captures the whole word on each side (not just the boundary letters) so
  // the logged hit reads as "bench- mark" -> "benchmark", not an
  // uninformative single-letter fragment.
  const fixed = text.replace(/([A-Za-z]+)-\s+([a-z]+)/g, (match, a: string, b: string) => {
    if (ELISION_CONJUNCTIONS.has(b.toLowerCase())) return match;
    hits.push(`"${a}- ${b}" -> "${a}${b}"`);
    return `${a}${b}`;
  });
  return { text: fixed, hits };
};

// Strips a trailing footnote/affiliation marker from an author token — a
// bare single digit stuck directly to the name ("Nakasendwa1") or a real
// unicode superscript digit ("Nagya¹") or a corresponding-author asterisk.
// These aren't part of anyone's name; the source document just doesn't carry
// actual affiliation text per author, so there's nothing to preserve by
// keeping the marker.
const SUPERSCRIPT_DIGITS = '¹²³⁴⁵⁶⁷⁸⁹⁰';
const parseAuthorToken = (raw: string): ParsedAuthor => {
  let name = raw.trim();
  let isCorresponding: boolean | undefined;
  if (name.endsWith('*')) {
    isCorresponding = true;
    name = name.slice(0, -1).trim();
  }
  while (name.length > 0 && SUPERSCRIPT_DIGITS.includes(name[name.length - 1])) {
    name = name.slice(0, -1).trim();
  }
  // A single trailing digit with NO preceding space (e.g. "Nakasendwa1") is a
  // footnote marker; a digit that's part of a real name never happens in
  // this dataset, and a space-separated trailing number would be something
  // else entirely (not stripped).
  name = name.replace(/(?<=[a-zA-Z])\d$/, '').trim();
  return isCorresponding ? { name, isCorresponding } : { name };
};

const splitAuthors = (line: string): ParsedAuthor[] => {
  // "&" and ";" both appear as separators in this document alongside the
  // usual comma — splitting on all three, never on a comma that's actually
  // part of a title like "Dr. Jane Doe, PhD" would over-split, but this
  // dataset's author lines never use post-nominal letters, only a flat name
  // list, so a plain split is safe here.
  const parts = line.split(/,|;|&/).map((p) => p.trim()).filter(Boolean);
  return parts.map(parseAuthorToken);
};

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

function parseBlock(code: string, block: string): ParsedAbstract {
  const anomalies: string[] = [];
  const normalizations: string[] = [];
  const lines = block.split('\n').map((l) => l.trim());

  const trackLineIdx = lines.findIndex((l) => /^Track\s+\d+\s*:/i.test(l));
  const authorsLineIdx = lines.findIndex((l) => /^Authors?\s*:/i.test(l));

  // Title is everything between the code line (already stripped out by the
  // caller) and the Track line (or the Authors line, if a given abstract has
  // no Track line at all).
  const titleEndIdx = trackLineIdx >= 0 ? trackLineIdx : authorsLineIdx >= 0 ? authorsLineIdx : -1;
  const title = titleEndIdx >= 0 ? lines.slice(0, titleEndIdx).join(' ').replace(/\s+/g, ' ').trim() : '';
  if (!title) anomalies.push('Missing title');

  let trackNumber: number | undefined;
  let trackLabelInSource: string | undefined;
  if (trackLineIdx >= 0) {
    const m = lines[trackLineIdx].match(/^Track\s+(\d+)\s*:\s*(.+)$/i);
    if (m) {
      trackNumber = Number(m[1]);
      trackLabelInSource = m[2].trim();
    }
  } else {
    anomalies.push('Missing Track line');
  }

  let rawAuthorsLine = '';
  let authors: ParsedAuthor[] = [];
  if (authorsLineIdx >= 0) {
    rawAuthorsLine = lines[authorsLineIdx].replace(/^Authors?\s*:\s*/i, '').trim();
    authors = splitAuthors(rawAuthorsLine);
    if (authors.length === 0) anomalies.push('Authors line present but no names parsed');
  } else {
    anomalies.push('No Authors line found');
  }

  const bodyStartIdx = (authorsLineIdx >= 0 ? authorsLineIdx : trackLineIdx >= 0 ? trackLineIdx : titleEndIdx) + 1;
  const bodyLinesRaw = lines.slice(Math.max(bodyStartIdx, 0));

  // Keywords, when present, are their own trailing line — pulled out before
  // the rest becomes the abstract body.
  let keywords: string[] = [];
  const keywordsLineIdx = bodyLinesRaw.findIndex((l) => /^Keywords?\s*:/i.test(l));
  let bodyLines = bodyLinesRaw;
  if (keywordsLineIdx >= 0) {
    const kwLine = bodyLinesRaw[keywordsLineIdx].replace(/^Keywords?\s*:\s*/i, '');
    keywords = kwLine.split(/[;,]/).map((k) => k.trim()).filter(Boolean);
    bodyLines = [...bodyLinesRaw.slice(0, keywordsLineIdx), ...bodyLinesRaw.slice(keywordsLineIdx + 1)];
  }

  let abstractText = normalizeWhitespace(bodyLines.join('\n'));
  const { text: dehyphenated, hits } = dehyphenate(abstractText);
  abstractText = dehyphenated;
  for (const hit of hits) normalizations.push(`De-hyphenated line-wrap: ${hit}`);

  const wordCount = countWords(abstractText);
  if (wordCount === 0) anomalies.push('Empty abstract body');
  else if (wordCount < 40) anomalies.push(`Suspiciously short body (${wordCount} words)`);

  if (AUTHOR_OVERRIDES[code]) {
    normalizations.push(`Author override applied (admin-confirmed): "${rawAuthorsLine}" -> "${AUTHOR_OVERRIDES[code]}"`);
    authors = [{ name: AUTHOR_OVERRIDES[code] }];
  }
  if (SINGLE_ENTITY_AUTHOR_OVERRIDES[code]) {
    normalizations.push(
      `Single-entity author override (generic splitter can't tell an org's own comma/& apart from a list): "${rawAuthorsLine}" -> "${SINGLE_ENTITY_AUTHOR_OVERRIDES[code]}"`
    );
    authors = [{ name: SINGLE_ENTITY_AUTHOR_OVERRIDES[code] }];
  }

  const confidence: 'high' | 'low' = anomalies.length === 0 ? 'high' : 'low';

  return {
    code,
    title,
    trackNumber,
    trackLabelInSource,
    authors,
    rawAuthorsLine,
    abstractText,
    keywords,
    confidence,
    anomalies,
    normalizations,
  };
}

export function parseSourceText(sourceText: string): { abstracts: ParsedAbstract[]; report: ParseReport } {
  const markers: { code: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  CODE_HEADER_RE.lastIndex = 0;
  while ((m = CODE_HEADER_RE.exec(sourceText))) {
    markers.push({ code: m[1], index: m.index + m[0].length });
  }

  const seen = new Set<string>();
  const duplicateCodes: string[] = [];
  const abstracts: ParsedAbstract[] = [];

  for (let i = 0; i < markers.length; i++) {
    const { code, index } = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1].index - `Abstract ID: ${markers[i + 1].code}`.length : sourceText.length;
    const block = sourceText.slice(index, end);
    if (seen.has(code)) duplicateCodes.push(code);
    seen.add(code);
    abstracts.push(parseBlock(code, block));
  }

  const highConfidence = abstracts.filter((a) => a.confidence === 'high').length;
  const report: ParseReport = {
    runAt: new Date().toISOString(),
    sourceFile: sourcePath,
    totalFound: abstracts.length,
    highConfidence,
    lowConfidence: abstracts.length - highConfidence,
    duplicateCodes,
    needsManualAttention: abstracts.filter((a) => a.anomalies.length > 0).map((a) => ({ code: a.code, anomalies: a.anomalies })),
  };

  return { abstracts, report };
}

function writeReport(report: ParseReport, abstracts: ParsedAbstract[]): string {
  const lines: string[] = [];
  lines.push('# Compendium abstract parse report');
  lines.push('');
  lines.push(`Run at: ${report.runAt}`);
  lines.push(`Source: ${report.sourceFile}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---|');
  lines.push(`| Total abstracts found | ${report.totalFound} |`);
  lines.push(`| High confidence (no anomalies) | ${report.highConfidence} |`);
  lines.push(`| Needs manual attention | ${report.lowConfidence} |`);
  lines.push(`| Duplicate codes | ${report.duplicateCodes.length} |`);
  lines.push('');

  if (report.duplicateCodes.length > 0) {
    lines.push('## Duplicate codes');
    lines.push('');
    for (const c of report.duplicateCodes) lines.push(`- ${c}`);
    lines.push('');
  }

  const withNormalizations = abstracts.filter((a) => a.normalizations.length > 0);
  if (withNormalizations.length > 0) {
    lines.push('## Normalizations applied (every change, per rule #7)');
    lines.push('');
    for (const a of withNormalizations) {
      lines.push(`**${a.code}**`);
      for (const n of a.normalizations) lines.push(`- ${n}`);
      lines.push('');
    }
  }

  lines.push('## Needs manual attention');
  lines.push('');
  if (report.needsManualAttention.length === 0) {
    lines.push('None.');
  } else {
    for (const item of report.needsManualAttention) {
      lines.push(`- **${item.code}**: ${item.anomalies.join('; ')}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

const isMain = import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

async function main(): Promise<void> {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    console.error('Pass --file <path> or place the extracted text at the default path above.');
    process.exit(1);
  }
  const sourceText = fs.readFileSync(sourcePath, 'utf-8');
  const { abstracts, report } = parseSourceText(sourceText);

  fs.mkdirSync(IMPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMPORT_DIR, 'parsed.json'), JSON.stringify(abstracts, null, 2), 'utf-8');
  fs.writeFileSync(path.join(IMPORT_DIR, 'parse-report.md'), writeReport(report, abstracts), 'utf-8');

  console.log(`Parsed ${abstracts.length} abstracts — ${report.highConfidence} high confidence, ${report.lowConfidence} need attention.`);
  console.log(`Wrote ${path.join(IMPORT_DIR, 'parsed.json')}`);
  console.log(`Wrote ${path.join(IMPORT_DIR, 'parse-report.md')}`);
}

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
