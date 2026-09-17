/**
 * scripts/syncVolunteerApplications.ts
 *
 * One-time migration of a raw volunteer-application export (the public
 * volunteer form's own CSV, NOT a Floot export — see syncFlootRegistrations.ts
 * for that one) into the real Registration collection.
 *
 * Usage:
 *   npx tsx src/scripts/syncVolunteerApplications.ts --file ./AI_in_Health_Summit_Volunteers.csv --dry-run
 *   npx tsx src/scripts/syncVolunteerApplications.ts --file ./AI_in_Health_Summit_Volunteers.csv
 *   npx tsx src/scripts/syncVolunteerApplications.ts --file ./AI_in_Health_Summit_Volunteers.csv --report ./volunteer-sync-report.json
 *
 * WHAT THIS DOES:
 * - Every row becomes `type: 'volunteer', status: 'pending'` — the same state
 *   a real submission through the public form lands in (registration.controller.ts's
 *   create(), no accessCode branch): an application awaiting staff review, not
 *   a confirmed volunteer. Nothing here issues an AccessCode or a QR ticket —
 *   that only ever happens when staff confirm someone (see
 *   confirmVolunteerDirectly in registration.controller.ts).
 * - The volunteer schema (Registration.model.ts / registration.validation.ts)
 *   has no dedicated field for "T-shirt Size" or "Track Selected" — those only
 *   exist in this export, not in the live form. Rather than silently dropping
 *   them, they're preserved as free-text entries in the existing `tags` field
 *   (e.g. "T-Shirt: XL", "Track: Guest Services"), the same field the Floot
 *   sync already uses for admin categorization notes. "Track Assigned" is
 *   captured the same way when present (it's blank for every row in the
 *   source export reviewed — nobody has been assigned to a track yet).
 * - "Date Applied" becomes `createdAt`, matching how the real form's
 *   submission time would read; rows missing it (a handful in the source
 *   export) fall back to the actual migration time.
 *
 * CONFLICT SAFETY:
 * - This is a one-time migration, not a repeatable live sync like Floot's —
 *   there's no marker field to distinguish "created by this script" from
 *   "created any other way", so a re-run treats every already-inserted row as
 *   a pre-existing record and reports it as a skipped conflict rather than
 *   touching it again. That's the correct, safe behavior for a fresh export
 *   containing the same people: never overwrite whatever an admin may have
 *   already done with that application (reviewed, confirmed, declined).
 * - Duplicate emails WITHIN one export (e.g. someone who applied twice) are
 *   resolved before writing — the most recently applied row wins — and every
 *   resolved group is listed in the report.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';

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
const reportArg = getArg('report');

if (isMain && !fileArg) {
  console.error('Usage: npx tsx src/scripts/syncVolunteerApplications.ts --file <path-to-csv> [--dry-run] [--report <path>]');
  process.exit(1);
}

const rawRowSchema = z.object({
  Name: z.string(),
  Email: z.string().email(),
  'Phone Number': z.string().optional().default(''),
  'T-shirt Size': z.string().optional().default(''),
  'Track Selected': z.string().optional().default(''),
  'Track Assigned': z.string().optional().default(''),
  'Date Applied': z.string().optional().default(''),
});

const norm = (s: string): string => s.trim();
// A handful of rows use "-" as a literal "not answered" placeholder rather
// than leaving the cell blank — treat both the same way.
const meaningful = (s: string): string | undefined => {
  const t = norm(s);
  return t && t !== '-' ? t : undefined;
};

const normalizePhone = (raw: string): string | undefined => {
  if (!raw.trim()) return undefined;
  const parsed = parsePhoneNumberFromString(raw, 'NG'); // unprefixed numbers in this export are Nigerian local format
  return parsed?.isValid() ? parsed.number : raw.trim(); // never silently drop a phone number just because it doesn't parse
};

interface SyncReport {
  runAt: string;
  dryRun: boolean;
  file: string;
  totalRowsInFile: number;
  validationFailures: Array<{ row: number; email?: string; error: string }>;
  duplicateEmailGroupsInFile: Array<{ email: string; keptRow: number; discardedRows: number[] }>;
  inserted: Array<{ email: string; fullName: string }>;
  skippedConflicts: Array<{ email: string; reason: string }>;
}

interface MappedRow {
  __rowIndex: number;
  fullName: string;
  email: string;
  phone?: string;
  tags?: string[];
  appliedAt?: Date;
}

export function parseCsv(csvPath: string, dryRun: boolean): { report: SyncReport; winners: MappedRow[] } {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records: Record<string, string>[] = parse(raw, { columns: true, skip_empty_lines: true });

  const report: SyncReport = {
    runAt: new Date().toISOString(),
    dryRun,
    file: csvPath,
    totalRowsInFile: records.length,
    validationFailures: [],
    duplicateEmailGroupsInFile: [],
    inserted: [],
    skippedConflicts: [],
  };

  const mappedRows: MappedRow[] = [];
  records.forEach((row, i) => {
    const rowIndex = i + 2;
    const parsed = rawRowSchema.safeParse(row);
    if (!parsed.success) {
      report.validationFailures.push({
        row: rowIndex,
        email: row['Email'],
        error: parsed.error.issues.map((iss) => iss.message).join('; '),
      });
      return;
    }
    const r = parsed.data;
    const email = r.Email.trim().toLowerCase();

    const tags: string[] = [];
    const tshirt = meaningful(r['T-shirt Size']);
    const trackSelected = meaningful(r['Track Selected']);
    const trackAssigned = meaningful(r['Track Assigned']);
    if (tshirt) tags.push(`T-Shirt: ${tshirt}`);
    if (trackSelected) tags.push(`Track Selected: ${trackSelected}`);
    if (trackAssigned) tags.push(`Track Assigned: ${trackAssigned}`);

    const dateApplied = meaningful(r['Date Applied']);
    const appliedAt = dateApplied ? new Date(dateApplied) : undefined;

    mappedRows.push({
      __rowIndex: rowIndex,
      fullName: r.Name.trim().replace(/\s+/g, ' '),
      email,
      phone: normalizePhone(r['Phone Number']),
      tags: tags.length > 0 ? tags : undefined,
      appliedAt: appliedAt && !Number.isNaN(appliedAt.getTime()) ? appliedAt : undefined,
    });
  });

  // ---- Resolve duplicate emails WITHIN this file — most recently applied wins ----
  const byEmail = new Map<string, MappedRow[]>();
  for (const row of mappedRows) {
    if (!byEmail.has(row.email)) byEmail.set(row.email, []);
    byEmail.get(row.email)!.push(row);
  }

  const winners: MappedRow[] = [];
  for (const [email, group] of byEmail) {
    if (group.length === 1) {
      winners.push(group[0]);
      continue;
    }
    const winner = group.slice().sort((a, b) => (b.appliedAt?.getTime() ?? 0) - (a.appliedAt?.getTime() ?? 0))[0];
    winners.push(winner);
    report.duplicateEmailGroupsInFile.push({
      email,
      keptRow: winner.__rowIndex,
      discardedRows: group.filter((r) => r !== winner).map((r) => r.__rowIndex),
    });
  }

  return { report, winners };
}

export async function applyToDb(winners: MappedRow[], report: SyncReport): Promise<void> {
  for (const row of winners) {
    const existing = await Registration.findOne({ type: 'volunteer', email: row.email }).lean();
    if (existing) {
      report.skippedConflicts.push({
        email: row.email,
        reason: 'A volunteer registration for this email already exists — left untouched.',
      });
      continue;
    }

    await Registration.create({
      type: 'volunteer',
      status: 'pending',
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      tags: row.tags,
      createdAt: row.appliedAt,
    });
    report.inserted.push({ email: row.email, fullName: row.fullName });
  }
}

async function main() {
  const csvPath = path.resolve(fileArg!);
  const { report, winners } = parseCsv(csvPath, dryRun);

  if (dryRun) {
    printSummary(report, winners.length);
    writeReport(report, reportArg, csvPath);
    return;
  }

  await connectDB();
  await applyToDb(winners, report);
  await disconnectDB();

  printSummary(report, winners.length);
  writeReport(report, reportArg, csvPath);
}

function printSummary(report: SyncReport, resolvedRowCount: number) {
  console.log(`\n--- ${report.dryRun ? 'DRY RUN — no writes performed' : 'MIGRATION COMPLETE'} ---`);
  console.log(`Total rows in file:          ${report.totalRowsInFile}`);
  console.log(`Validation failures:         ${report.validationFailures.length}`);
  console.log(`Duplicate email groups:      ${report.duplicateEmailGroupsInFile.length}`);
  console.log(`Rows resolved to migrate:    ${resolvedRowCount}`);
  if (!report.dryRun) {
    console.log(`Inserted (new):              ${report.inserted.length}`);
    console.log(`Skipped — already exists:    ${report.skippedConflicts.length}`);
  }
  if (report.validationFailures.length) {
    console.log('\n⚠️  Some rows need manual attention — see the full report.');
  }
}

function writeReport(report: SyncReport, reportArg: string | null, csvPath: string) {
  const reportPath = reportArg
    ? path.resolve(reportArg)
    : path.join(path.dirname(csvPath), `volunteer-sync-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to: ${reportPath}`);
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Volunteer application migration failed');
    process.exit(1);
  });
}
