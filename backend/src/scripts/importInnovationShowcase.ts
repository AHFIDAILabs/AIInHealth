/**
 * scripts/importInnovationShowcase.ts
 *
 * One-time import of the Innovation Showcase judging tracker into the new
 * InnovationShowcaseEntry collection — the safe public subset backing the
 * new "Confirmed Innovation Showcase" page. Entirely separate from
 * Innovation.model.ts (the admin-curated directory behind the existing
 * /innovation-showcase page) — see InnovationShowcaseEntry.model.ts's
 * header comment.
 *
 * Two source files, joined by startup name:
 *   - Sheet2 (judging scores + Accepted/Declined decision) decides WHICH
 *     startups get imported — only Status === 'Accepted' rows.
 *   - Sheet1 (the original application form) supplies every actual field —
 *     Sheet2 is judging metadata only, never written to the new collection.
 *
 * Deliberately dropped, never written anywhere by this script: Main Contact
 * Person, Job Title, Email address, Phone Number, Upload Pitch Deck, Demo
 * Video Link — private contact info / unlisted links in the source form
 * with no public-safe use here.
 *
 * Usage:
 *   npx tsx src/scripts/importInnovationShowcase.ts --dry-run
 *   npx tsx src/scripts/importInnovationShowcase.ts
 *
 * Upserts by `startupName` (case/whitespace-insensitive match), so
 * re-running after a correction in either source file is safe.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { InnovationShowcaseEntry } from '../models/InnovationShowcaseEntry.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SHEET1 = path.join(__dirname, 'data', 'Innovation_Showcase__Sheet1.csv');
const DEFAULT_SHEET2 = path.join(__dirname, 'data', 'Innovation_Showcase__Sheet2.csv');
const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const clean = (s: string | undefined): string | undefined => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t || undefined;
};

// Case/whitespace/hyphen-insensitive so "NVIT " (Sheet1) matches "NVIT"
// (Sheet2) and "DAS-MEDHUB" (Sheet2) matches "DAS MEDHUB" (Sheet1).
const normalizeName = (s: string): string => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

// Two applicants filled in a personal/organization name under "Startup
// Name" and put the actual product name (the one judges scored under in
// Sheet2) under "Product or Solution Name" instead — same class of
// inconsistency as the NVIT/BalmEHR mismatch flagged when this import was
// scoped. Falls back to a startup-name-is-a-prefix-of-the-other check
// (catches "Eco Inbox Hub Limited" vs the source's own typo "...Limite")
// before giving up.
const findSheet1Row = (
  acceptedStartup: string,
  sheet1Records: Record<string, string>[]
): Record<string, string> | undefined => {
  const target = normalizeName(acceptedStartup);
  const byName = sheet1Records.find((r) => normalizeName(clean(r['Startup Name']) ?? '') === target);
  if (byName) return byName;
  const byProduct = sheet1Records.find((r) => normalizeName(clean(r['Product or Solution Name']) ?? '') === target);
  if (byProduct) return byProduct;
  const byNamePrefix = sheet1Records.find((r) => {
    const name = normalizeName(clean(r['Startup Name']) ?? '');
    return name.length > 4 && (name.startsWith(target) || target.startsWith(name));
  });
  if (byNamePrefix) return byNamePrefix;
  // Last resort: the product name contains the accepted startup name as a
  // substring (e.g. Sheet2's "FarajaMH" inside Sheet1's "FarajaMH (Mental
  // Health Screening App)").
  return sheet1Records.find((r) => {
    const product = normalizeName(clean(r['Product or Solution Name']) ?? '');
    return target.length > 4 && product.includes(target);
  });
};

interface Sheet2Row {
  startup: string;
  status: string;
  total: number;
}

interface MappedEntry {
  startupName: string;
  founderNames?: string;
  country?: string;
  yearFounded?: string;
  website?: string;
  socialMedia?: string;
  description?: string;
  solutionName?: string;
  solutionDescription?: string;
  problemAddressed?: string;
  aiTechnologies?: string;
  category?: string;
  trl?: string;
  stageOfDevelopment?: string;
  hasCustomers?: string;
  evidenceOfImpact?: string;
  demoHighlight?: string;
  uniqueValue?: string;
  order: number;
}

interface ImportReport {
  runAt: string;
  dryRun: boolean;
  acceptedInSheet2: number;
  matched: string[];
  unmatchedAccepted: string[];
  created: string[];
  updated: string[];
}

export function parseSources(
  sheet1Path: string,
  sheet2Path: string
): { report: ImportReport; entries: MappedEntry[] } {
  const sheet2Records: Record<string, string>[] = parse(fs.readFileSync(sheet2Path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  });
  const sheet1Records: Record<string, string>[] = parse(fs.readFileSync(sheet1Path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  });

  const sheet2: Sheet2Row[] = sheet2Records.map((r) => ({
    startup: clean(r['Startup']) ?? '',
    status: clean(r['Status']) ?? '',
    total: Number(r['Total(100)']) || 0,
  }));

  const accepted = sheet2.filter((r) => r.status.toLowerCase() === 'accepted' && r.startup);
  // Highest-scoring startup shown first on the public page.
  accepted.sort((a, b) => b.total - a.total);

  const report: ImportReport = {
    runAt: new Date().toISOString(),
    dryRun,
    acceptedInSheet2: accepted.length,
    matched: [],
    unmatchedAccepted: [],
    created: [],
    updated: [],
  };

  const entries: MappedEntry[] = [];
  accepted.forEach((acceptedRow, index) => {
    const row = findSheet1Row(acceptedRow.startup, sheet1Records);
    if (!row) {
      report.unmatchedAccepted.push(acceptedRow.startup);
      return;
    }
    report.matched.push(acceptedRow.startup);

    entries.push({
      // Sheet2's own name is the one judges actually accepted under — more
      // reliable than Sheet1's "Startup Name" for the couple of rows where
      // that field was filled with a personal/organization name instead
      // (see findSheet1Row's comment).
      startupName: acceptedRow.startup,
      founderNames: clean(row["Founder(s) Name(s)"]),
      country: clean(row['Country of Headquarters']),
      yearFounded: clean(row['Year Founder']),
      website: clean(row['Company Website']),
      socialMedia: clean(row['Social Media (LinkedIn, X/Twitter, etc)']),
      description: clean(row['Brief Company Description (Max 150 words)']),
      solutionName: clean(row['Product or Solution Name']),
      solutionDescription: clean(row['Describe your solution (100 -200)']),
      problemAddressed: clean(row['What healthcare problem does your solution address?']),
      aiTechnologies: clean(row['What AI or ML technologies does your product use?']),
      category: clean(row['What Category best describes your solution?']),
      trl: clean(row['Technology Readiness Level (TRL)']),
      stageOfDevelopment: clean(row['Current Stage of Development']),
      hasCustomers: clean(row['Do you currently have customers or active users?']),
      evidenceOfImpact: clean(row['Evidence of Impact/ Results']),
      demoHighlight: clean(row['What will you demo at the AI in Health Summit?']),
      uniqueValue: clean(row['What makes your solution innovative or unique?']),
      order: index,
    });
  });

  return { report, entries };
}

export async function applyToDb(entries: MappedEntry[], report: ImportReport): Promise<void> {
  for (const entry of entries) {
    const existing = await InnovationShowcaseEntry.findOne({
      startupName: new RegExp(`^${entry.startupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (existing) {
      await InnovationShowcaseEntry.updateOne({ _id: existing._id }, entry);
      report.updated.push(entry.startupName);
      continue;
    }

    await InnovationShowcaseEntry.create({ ...entry, isPublished: true });
    report.created.push(entry.startupName);
  }
}

async function main() {
  const { report, entries } = parseSources(DEFAULT_SHEET1, DEFAULT_SHEET2);

  if (dryRun) {
    printSummary(report);
    return;
  }

  await connectDB();
  await applyToDb(entries, report);
  await disconnectDB();

  printSummary(report);
}

function printSummary(report: ImportReport) {
  console.log(`\n--- ${report.dryRun ? 'DRY RUN — no writes performed' : 'IMPORT COMPLETE'} ---`);
  console.log(`Accepted in Sheet2:      ${report.acceptedInSheet2}`);
  console.log(`Matched to Sheet1:       ${report.matched.length}`);
  console.log(`Unmatched (skipped):     ${report.unmatchedAccepted.length}`);
  if (!report.dryRun) {
    console.log(`Created:                 ${report.created.length}`);
    console.log(`Updated:                 ${report.updated.length}`);
  }
  if (report.unmatchedAccepted.length) {
    console.log('\n⚠️  Accepted startups with no matching Sheet1 application (not imported):');
    for (const name of report.unmatchedAccepted) console.log(`  ${name}`);
  }
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Innovation showcase import failed');
    process.exit(1);
  });
}
