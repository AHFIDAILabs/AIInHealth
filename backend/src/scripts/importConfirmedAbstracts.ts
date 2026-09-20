/**
 * scripts/importConfirmedAbstracts.ts
 *
 * One-time import of the committee's confirmed-abstract tracker export into
 * the new ConfirmedAbstract collection — the safe public subset backing the
 * new "Confirmed Abstract Presentations" page. This is entirely separate
 * from the submission/review pipeline (Abstract.model.ts) — see
 * ConfirmedAbstract.model.ts's header comment.
 *
 * Deliberately dropped, never written anywhere by this script: Email,
 * "Head shot submitted", "Visa Assisstance", "Other Asks" — private/
 * operational columns in the source tracker with no public-safe use here.
 *
 * Usage:
 *   npx tsx src/scripts/importConfirmedAbstracts.ts --dry-run
 *   npx tsx src/scripts/importConfirmedAbstracts.ts
 *   npx tsx src/scripts/importConfirmedAbstracts.ts --file ./some-other-export.csv
 *
 * Upserts by `code` (the Abstract Code column), so re-running after the
 * source tracker is corrected is safe — it updates the matching row's
 * fields rather than creating a duplicate.
 *
 * TRACK MAPPING: the tracker records tracks as bare numbers 1-4. Those are
 * mapped below to the live Track collection's actual names (queried
 * directly against the DB at the time this script was written — see
 * TRACK_MAP). A handful of rows in the source file have a literal "yes" in
 * the Track column instead of a number (a data-entry error, not a 5th
 * track) — rather than guessing, those are imported with `track` left
 * unset and a note in `internalNotes` flagging it for manual admin
 * correction, exactly as flagged when this import was scoped.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { ConfirmedAbstract } from '../models/ConfirmedAbstract.model.js';
import type { PresentationType } from '../types/enums.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(__dirname, 'data', 'Abstract_Tracker__Confirmed_list.csv');
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const withEquals = args.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

const fileArg = getArg('file');
const dryRun = args.includes('--dry-run');

const TRACK_MAP: Record<string, string> = {
  '1': 'National AI-in-Health Strategy, Governance & Regulatory Frameworks',
  '2': 'Strengthening Health Systems Through AI-enabled Service Delivery',
  '3': 'Data Ecosystems, Infrastructure & Interoperability',
  '4': 'AI for Public Health Intelligence & National Preparedness',
};

const rawRowSchema = z.object({
  'Abstract Code': z.string().min(1),
  Author: z.string().min(1),
  'Abstract Title': z.string().min(1),
  'Presentation Type': z.string().optional().default(''),
  Track: z.string().optional().default(''),
  Country: z.string().optional().default(''),
});

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

const mapPresentationType = (raw: string): PresentationType | undefined => {
  const t = raw.toLowerCase();
  if (t.includes('oral')) return 'oral';
  if (t.includes('poster')) return 'poster';
  return undefined;
};

interface MappedRow {
  code: string;
  authorName: string;
  title: string;
  presentationType?: PresentationType;
  track?: string;
  country?: string;
  internalNotes?: string;
}

interface ImportReport {
  runAt: string;
  dryRun: boolean;
  file: string;
  totalRowsInFile: number;
  validationFailures: Array<{ row: number; code?: string; error: string }>;
  flaggedTrack: Array<{ code: string; rawTrack: string }>;
  created: string[];
  updated: string[];
}

export function parseCsv(csvPath: string): { report: ImportReport; rows: MappedRow[] } {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records: Record<string, string>[] = parse(raw, { columns: true, skip_empty_lines: true });

  const report: ImportReport = {
    runAt: new Date().toISOString(),
    dryRun,
    file: csvPath,
    totalRowsInFile: records.length,
    validationFailures: [],
    flaggedTrack: [],
    created: [],
    updated: [],
  };

  const rows: MappedRow[] = [];
  records.forEach((row, i) => {
    const rowIndex = i + 2;
    const parsed = rawRowSchema.safeParse(row);
    if (!parsed.success) {
      report.validationFailures.push({
        row: rowIndex,
        code: row['Abstract Code'],
        error: parsed.error.issues.map((iss) => iss.message).join('; '),
      });
      return;
    }
    const r = parsed.data;
    const code = clean(r['Abstract Code']);
    const rawTrack = r.Track.trim();
    const track = TRACK_MAP[rawTrack];
    let internalNotes: string | undefined;
    if (rawTrack && !track) {
      internalNotes = `Track value in source data was "${rawTrack}" — invalid, needs manual assignment.`;
      report.flaggedTrack.push({ code, rawTrack });
    }

    rows.push({
      code,
      authorName: clean(r.Author),
      title: clean(r['Abstract Title']),
      presentationType: mapPresentationType(r['Presentation Type']),
      track,
      country: r.Country.trim() || undefined,
      internalNotes,
    });
  });

  return { report, rows };
}

export async function applyToDb(rows: MappedRow[], report: ImportReport): Promise<void> {
  for (const [index, row] of rows.entries()) {
    const existing = await ConfirmedAbstract.findOne({ code: row.code });
    if (existing) {
      await ConfirmedAbstract.updateOne(
        { _id: existing._id },
        {
          authorName: row.authorName,
          title: row.title,
          presentationType: row.presentationType,
          track: row.track,
          country: row.country,
          internalNotes: row.internalNotes,
        }
      );
      report.updated.push(row.code);
      continue;
    }

    await ConfirmedAbstract.create({
      code: row.code,
      authorName: row.authorName,
      title: row.title,
      presentationType: row.presentationType,
      track: row.track,
      country: row.country,
      internalNotes: row.internalNotes,
      order: index,
      isPublished: true,
    });
    report.created.push(row.code);
  }
}

async function main() {
  const csvPath = path.resolve(fileArg ?? DEFAULT_FILE);
  const { report, rows } = parseCsv(csvPath);

  if (dryRun) {
    printSummary(report);
    return;
  }

  await connectDB();
  await applyToDb(rows, report);
  await disconnectDB();

  printSummary(report);
}

function printSummary(report: ImportReport) {
  console.log(`\n--- ${report.dryRun ? 'DRY RUN — no writes performed' : 'IMPORT COMPLETE'} ---`);
  console.log(`Total rows in file:     ${report.totalRowsInFile}`);
  console.log(`Validation failures:    ${report.validationFailures.length}`);
  console.log(`Flagged track values:   ${report.flaggedTrack.length}`);
  if (!report.dryRun) {
    console.log(`Created:                ${report.created.length}`);
    console.log(`Updated:                ${report.updated.length}`);
  }
  if (report.flaggedTrack.length) {
    console.log('\nRows needing manual track assignment in the admin UI:');
    for (const f of report.flaggedTrack) console.log(`  ${f.code} (raw value: "${f.rawTrack}")`);
  }
  if (report.validationFailures.length) {
    console.log('\n⚠️  Some rows failed validation:');
    for (const f of report.validationFailures) console.log(`  row ${f.row} (${f.code ?? 'unknown'}): ${f.error}`);
  }
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Confirmed abstract import failed');
    process.exit(1);
  });
}
