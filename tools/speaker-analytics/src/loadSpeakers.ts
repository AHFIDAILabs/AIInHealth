import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';

// Step 2 of the brief: load the source-of-truth CSV, drop the email column
// immediately (never written back out, never logged), trim whitespace, drop
// exact duplicate rows, and detect "(V)" as a virtual-speaker marker.
//
// This file has NO network/DB access of any kind — the CSV is the only
// input, per the task's hard safety rules.

export interface RawSpeakerRow {
  id: string;
  name: string;
  title: string;
  organisation: string;
}

export interface CleanedSpeaker extends RawSpeakerRow {
  virtual: boolean;
}

const VIRTUAL_MARKER = /\s*\(v\)\s*$/i;

export const loadSpeakersCsv = (csvPath: string): CleanedSpeaker[] => {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse ${csvPath}: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }

  const seen = new Set<string>();
  const cleaned: CleanedSpeaker[] = [];

  for (const row of parsed.data) {
    // Email is dropped here, at the very first opportunity — `row` itself is
    // never referenced again after this block, so it can never leak into a
    // later log line or output file by accident.
    const id = (row.id ?? '').trim();
    const rawName = (row.name ?? '').trim();
    const title = (row.title ?? '').trim();
    const organisation = (row.organisation ?? '').trim();

    if (!id && !rawName) continue; // a genuinely blank row (trailing newline, etc.)

    const virtual = VIRTUAL_MARKER.test(rawName);
    const name = rawName.replace(VIRTUAL_MARKER, '').trim();

    const dedupeKey = `${id}|${name}|${title}|${organisation}`;
    if (seen.has(dedupeKey)) continue; // exact duplicate row
    seen.add(dedupeKey);

    cleaned.push({ id, name, title, organisation, virtual });
  }

  return cleaned;
};

export const SPEAKERS_CSV_PATH = path.resolve(import.meta.dirname, '../data/speakers.csv');
