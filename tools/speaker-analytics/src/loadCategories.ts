import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { loadSpeakersCsv, SPEAKERS_CSV_PATH } from './loadSpeakers.js';
import type { Sector, Seniority } from './categories.js';

export interface CategorizedSpeaker {
  id: string;
  name: string;
  organisation: string;
  // null only for a speaker whose profile is genuinely incomplete (no real
  // title/organisation yet) — a real confirmed speaker who still counts
  // toward the headline total but can't be charted by sector/seniority
  // because there's nothing real to categorize. See categorize.ts.
  sector: Sector | null;
  seniority: Seniority | null;
  virtual: boolean;
}

export const CATEGORIES_CSV_PATH = path.resolve(import.meta.dirname, '../data/speaker_categories.csv');

const INCOMPLETE_NOTE_PREFIX = 'INCOMPLETE';

// Joins the approved speaker_categories.csv (Step 3's human-reviewed output)
// back against the cleaned speaker list purely to recover the `virtual`
// flag, which categorize.ts doesn't carry through — everything else comes
// straight from the categories file, since that's the one a human has
// actually reviewed and approved. A blank sector/seniority is only ever
// tolerated when categorize.ts itself marked the row INCOMPLETE (a real
// speaker with no bio on file yet); any other blank means a speaker was
// added since the last categorize pass and genuinely needs human review —
// that case still hard-stops the render, same as before.
export const loadApprovedCategories = (): CategorizedSpeaker[] => {
  const raw = fs.readFileSync(CATEGORIES_CSV_PATH, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse ${CATEGORIES_CSV_PATH}: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }

  const virtualById = new Map(loadSpeakersCsv(SPEAKERS_CSV_PATH).map((s) => [s.id, s.virtual]));

  const rows: CategorizedSpeaker[] = [];
  for (const row of parsed.data) {
    const sector = (row.sector ?? '').trim();
    const seniority = (row.seniority ?? '').trim();
    const isIncomplete = (row.notes ?? '').startsWith(INCOMPLETE_NOTE_PREFIX);

    if ((!sector || !seniority) && !isIncomplete) {
      throw new Error(
        `Speaker "${row.name}" (${row.id}) has no approved sector/seniority yet — add it to src/categories.ts and re-run "npm run categorize" before rendering.`
      );
    }

    rows.push({
      id: row.id,
      name: row.name,
      organisation: (row.organisation ?? '').trim(),
      sector: isIncomplete ? null : (sector as Sector),
      seniority: isIncomplete ? null : (seniority as Seniority),
      virtual: virtualById.get(row.id) ?? false,
    });
  }
  return rows;
};
