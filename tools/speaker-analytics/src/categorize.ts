import fs from 'node:fs';
import path from 'node:path';
import { loadSpeakersCsv, SPEAKERS_CSV_PATH, type CleanedSpeaker } from './loadSpeakers.js';
import { CATEGORY_BY_ID, EXCLUDED_IDS } from './categories.js';

// Step 3 of the brief: join the cleaned speaker list against the manually
// reasoned categories.ts lookup and write speaker_categories.csv for human
// review. Every real, currently-attending speaker is written out — nobody
// is dropped from the headline count just because we don't have their title/
// organisation yet (an incomplete profile is still a real confirmed
// speaker). What varies is whether sector/seniority get filled in:
//   1. Explicitly excluded (categories.ts's EXCLUDED_IDS) — a real profile
//      excluded for a stated reason (e.g. no longer attending). The ONLY
//      case actually dropped from the file entirely.
//   2. Incomplete profile (literal "Details pending" placeholder title with
//      no organisation) — included, but sector/seniority stay blank with an
//      INCOMPLETE note, since there's nothing real to categorize yet.
//   3. Categorized (has a CATEGORY_BY_ID entry) — included with full data.
//   4. Uncategorized (real-looking data, but nobody's reviewed it yet) —
//      included with blank sector/seniority and a NEEDS REVIEW note, so a
//      newly added speaker since the last pass is impossible to miss.
// render.ts counts every row here toward the headline "Speakers" total, but
// only rows with a real sector/seniority feed the breakdown charts — see its
// own comment on why those two numbers legitimately differ.
const OUT_PATH = path.resolve(import.meta.dirname, '../data/speaker_categories.csv');

const PLACEHOLDER_TITLE = 'Details pending';
const isIncompleteProfile = (s: CleanedSpeaker): boolean => s.title === PLACEHOLDER_TITLE && !s.organisation;

const csvEscape = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const run = () => {
  const speakers = loadSpeakersCsv(SPEAKERS_CSV_PATH);
  const rows = ['id,name,organisation,sector,seniority,notes'];
  let needsReview = 0;
  let incomplete = 0;
  let excludedManual = 0;

  for (const s of speakers) {
    if (EXCLUDED_IDS[s.id]) {
      excludedManual += 1;
      console.log(`(excluded) ${s.name} — ${EXCLUDED_IDS[s.id]}`);
      continue;
    }

    if (isIncompleteProfile(s)) {
      incomplete += 1;
      console.log(`(incomplete profile, counted but not categorized) ${s.name}`);
      rows.push([s.id, csvEscape(s.name), csvEscape(s.organisation), '', '', 'INCOMPLETE — no real title/organisation on file yet.'].join(','));
      continue;
    }

    const category = CATEGORY_BY_ID[s.id];
    const sector = category?.sector ?? '';
    const seniority = category?.seniority ?? '';
    const notes = category ? (category.notes ?? '') : 'NEEDS REVIEW — no category on file for this speaker yet.';
    if (!category) needsReview += 1;

    rows.push([s.id, csvEscape(s.name), csvEscape(s.organisation), csvEscape(sector), csvEscape(seniority), csvEscape(notes)].join(','));
  }

  fs.writeFileSync(OUT_PATH, rows.join('\n') + '\n', 'utf-8');
  console.log(`\nWrote ${rows.length - 1} rows to ${OUT_PATH}`);
  console.log(`${incomplete} incomplete profile(s) (counted, not categorized), ${excludedManual} manually excluded.`);
  if (needsReview > 0) {
    console.log(`${needsReview} speaker(s) need a category added to src/categories.ts before rendering.`);
  }
};

run();
