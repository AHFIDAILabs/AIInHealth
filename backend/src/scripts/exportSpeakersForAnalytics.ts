// One-off tool's data source — writes /tools/speaker-analytics/data/speakers.csv
// from the real Speaker collection. Lives here (not inside the analytics
// tool itself) because it's the only part of that workflow that needs a DB
// connection — the analytics tool's own package.json has zero DB dependency
// by design (see tools/speaker-analytics/README.md), so this script is what
// keeps it fed. Re-run anytime the speaker list changes:
//   cd backend && npx tsx src/scripts/exportSpeakersForAnalytics.ts
//
// Exports EVERY speaker, published or draft — isPublished only governs the
// live public website, not who's actually confirmed to speak, and several
// real confirmed speakers (ministers, legislators) sit in draft while their
// public bio copy is still being finalized. Filtering here would silently
// drop them. Incomplete placeholder profiles (a brand-new speaker registered
// before their real title/org was known — literal "Details pending") and
// anyone no longer attending are NOT filtered here either — that's
// categorize.ts's job, which excludes them explicitly and says why, rather
// than this script silently deciding who counts.
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { Speaker } from '../models/Speaker.model.js';

const OUT_PATH = path.resolve(import.meta.dirname, '../../../tools/speaker-analytics/data/speakers.csv');

const csvEscape = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);

  const speakers = await Speaker.find().select('fullName title organization email').sort({ order: 1 });

  const rows = ['id,name,title,organisation,email'];
  for (const s of speakers) {
    rows.push(
      [s.id, csvEscape(s.fullName ?? ''), csvEscape(s.title ?? ''), csvEscape(s.organization ?? ''), csvEscape(s.email ?? '')].join(',')
    );
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, rows.join('\n') + '\n', 'utf-8');
  console.log(`Exported ${speakers.length} speakers (published + draft) to ${OUT_PATH}`);

  await mongoose.disconnect();
};
run();
