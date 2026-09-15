/**
 * scripts/syncFlootRegistrations.ts
 *
 * Repeatable sync of the Floot (floot.com) CSV export into the real
 * Registration collection, for the transition period where Floot and this
 * system both take live attendee registrations. Safe to run again and again
 * with a fresher export each time, right up until Floot is retired.
 *
 * Usage:
 *   npx tsx src/scripts/syncFlootRegistrations.ts --file ./attendees-export.csv --dry-run
 *   npx tsx src/scripts/syncFlootRegistrations.ts --file ./attendees-export.csv
 *   npx tsx src/scripts/syncFlootRegistrations.ts --file ./attendees-export.csv --report ./sync-report.json
 *
 * WHAT THIS DOES:
 * - Maps Floot's export columns onto the REAL Registration schema (see
 *   Registration.model.ts) — every migrated row is `type: 'attendee'`.
 * - Two fields have nowhere else to live and are stored in `flootSync`
 *   (invoiceId/gatewayReference/rawNotes) rather than the live
 *   paymentReference field, which is specifically the Paystack transaction
 *   reference payment.controller.ts's webhook/verify flow looks up by —
 *   Floot's old processor's references must never collide with or be
 *   confused for a real Paystack one.
 * - "Checked In" from Floot is deliberately NEVER migrated (confirmed with
 *   the team: Floot's flag is its own admin-processing marker, not a real
 *   door scan — several sampled rows show a "checked in" date BEFORE the
 *   event itself). Every synced row keeps checkedIn: false; only a real QR
 *   scan at the door (checkin.controller.ts) ever flips it.
 * - A confirmed row gets a real qrToken generated (if it doesn't have one
 *   yet) so that person has a working e-ticket in the new system.
 *   `paidAt` is set to Floot's own "Registered At" timestamp when payment
 *   maps to 'paid' and no paidAt exists yet — an approximation (Floot has no
 *   separate paid-at column), noted in the report.
 *
 * CONFLICT SAFETY (why a plain upsert isn't good enough for a REPEATED sync):
 * - Every record this script ever creates or touches gets a `flootSync`
 *   bookkeeping block (see Registration.model.ts's comment on that field).
 * - If a matching (type: attendee, email) record already exists but has NO
 *   `flootSync` block, it means that record was created directly in the new
 *   system (not from a prior Floot sync) — this run leaves it COMPLETELY
 *   untouched and reports it as a conflict for manual review, rather than
 *   silently merging Floot data into it.
 * - Contact/registration-detail fields (name, phone, org, job title, ticket
 *   category, dietary requirements, tags) are Floot-owned for as long as
 *   Floot is the live intake form, so they're refreshed unconditionally on
 *   every sync.
 * - `status`/`paymentStatus` are only refreshed from Floot if THIS system's
 *   current value still matches what Floot last reported (i.e. nothing here
 *   — an admin, or a real Paystack payment — has independently moved the
 *   record on since the last sync). Once diverged, that field is never
 *   touched by Floot again; the report lists every field skipped this way.
 * - isActive, checkedIn/checkedInAt, qrToken, discountPercent, accessCode,
 *   avatarUrl, directoryOptIn, portalLastLinkSentAt are NEVER touched by a
 *   sync after the initial insert — those are exclusively this system's own.
 *
 * Duplicate emails WITHIN one export (a Floot double-submit, or someone who
 * registered twice) are resolved before writing — prefer a confirmed/paid
 * row, else the most recently registered — and every resolved group is
 * listed in the report so it can actually be reviewed, not just counted.
 *
 * Any row with a Ticket Type / Status / Payment Status value this script
 * doesn't recognize is skipped and listed in the report rather than guessed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { generateQrToken } from '../services/qr.service.js';
import type { TicketCategory, RegistrationStatus, PaymentStatus } from '../types/enums.js';

// ---------- CLI args ----------
// Guarded behind isMain (below) so a test harness can import parseCsv/applyToDb
// from this module without triggering CLI argv validation or main() itself.
// pathToFileURL (not a hand-built `file://${...}` string) is required for this
// comparison to work on Windows — process.argv[1] there is a drive-letter path
// like "C:\...", and naively prepending "file://" produces "file://C:/..."
// instead of the correct "file:///C:/...", which never equals import.meta.url
// and silently made isMain always false (main() never ran) on Windows.
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
  console.error('Usage: npx tsx src/scripts/syncFlootRegistrations.ts --file <path-to-csv> [--dry-run] [--report <path>]');
  process.exit(1);
}

// ---------- Raw row shape (Floot's actual export headers) ----------
const rawRowSchema = z.object({
  'First Name': z.string(),
  'Last Name': z.string(),
  Email: z.string().email(),
  Phone: z.string().optional().default(''),
  Company: z.string().optional().default(''),
  'Job Title': z.string().optional().default(''),
  'Attendee Type': z.string().optional().default(''),
  'Ticket Type': z.string(),
  Status: z.string(),
  'Payment Status': z.string(),
  'Checked In': z.string().optional().default('No'),
  'Checked In At': z.string().optional().default(''),
  'Dietary Requirements': z.string().optional().default(''),
  Tags: z.string().optional().default(''),
  Notes: z.string().optional().default(''),
  'Registered At': z.string(),
});
type RawRow = z.infer<typeof rawRowSchema>;

// ---------- Enum mapping — unrecognized values are skipped, never guessed ----------
const TICKET_TYPE_MAP: Record<string, TicketCategory> = {
  'international delegate': 'international_delegate',
  'nigerian professional': 'nigerian_professional',
  'student / researcher': 'student_researcher',
  vip: 'vip',
  'government official': 'government_official',
  'accredited media': 'accredited_media',
};
const STATUS_MAP: Record<string, RegistrationStatus> = {
  pending: 'pending',
  confirmed: 'confirmed',
  declined: 'declined',
  // Floot's schema (per the sample data reviewed) has no distinct "waitlisted"
  // state — if the fuller export turns out to have one, it lands here as an
  // unmapped value and gets reported rather than silently coerced.
};
const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  pending: 'unpaid',
  completed: 'paid',
  failed: 'failed',
  // Same note as above for a possible "refunded" value — this system has no
  // equivalent PaymentStatus today; report it rather than guess.
};

const norm = (s: string): string => s.trim().toLowerCase();

// ---------- Helpers ----------
const extractInvoiceId = (notes: string): string | undefined => notes.match(/INV-[A-Z0-9]+/)?.[0];
const extractGatewayReference = (notes: string): string | undefined => notes.match(/PRQ_[a-zA-Z0-9]+/)?.[0];

const normalizePhone = (raw: string): string | undefined => {
  if (!raw.trim()) return undefined;
  const parsed = parsePhoneNumberFromString(raw, 'NG'); // Floot's numbers are unprefixed local NG format by default
  return parsed?.isValid() ? parsed.number : raw.trim(); // never silently drop a phone number just because it doesn't parse
};

const titleCase = (str: string): string =>
  str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const parseTags = (raw: string): string[] | undefined => {
  const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

// ---------- Report ----------
interface SyncReport {
  runAt: string;
  dryRun: boolean;
  file: string;
  totalRowsInFile: number;
  validationFailures: Array<{ row: number; email?: string; error: string }>;
  unmappedEnumValues: Array<{ row: number; email: string; field: string; value: string }>;
  duplicateEmailGroupsInFile: Array<{ email: string; keptRow: number; discardedRows: number[] }>;
  inserted: Array<{ email: string; fullName: string; status: string }>;
  updated: Array<{ email: string; changedFields: string[] }>;
  skippedConflicts: Array<{ email: string; reason: string }>;
  skippedDivergedFields: Array<{ email: string; field: string; oursValue: string; flootValue: string }>;
  rowsMissingCountry: number;
}

interface MappedRow {
  __rowIndex: number;
  fullName: string;
  email: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  ticketCategory: TicketCategory;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  dietaryRequirements?: string;
  tags?: string[];
  registeredAt: Date;
  invoiceId?: string;
  gatewayReference?: string;
  rawNotes?: string;
}

// Parsing/mapping/dedupe is pure (no DB access) so it's split out from the
// actual writes below — this also lets a test harness call parseCsv() and
// applyToDb() separately within a single DB connection, instead of the CLI's
// one-shot connectDB()-then-exit lifecycle.
export function parseCsv(csvPath: string, dryRun: boolean): { report: SyncReport; winners: MappedRow[] } {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records: Record<string, string>[] = parse(raw, { columns: true, skip_empty_lines: true });

  const report: SyncReport = {
    runAt: new Date().toISOString(),
    dryRun,
    file: csvPath,
    totalRowsInFile: records.length,
    validationFailures: [],
    unmappedEnumValues: [],
    duplicateEmailGroupsInFile: [],
    inserted: [],
    updated: [],
    skippedConflicts: [],
    skippedDivergedFields: [],
    rowsMissingCountry: 0,
  };

  // ---- Step 1: shape-validate every row ----
  const validRows: Array<RawRow & { __rowIndex: number }> = [];
  records.forEach((row, i) => {
    const parsed = rawRowSchema.safeParse(row);
    if (!parsed.success) {
      report.validationFailures.push({
        row: i + 2,
        email: row['Email'],
        error: parsed.error.issues.map((iss) => iss.message).join('; '),
      });
      return;
    }
    validRows.push({ ...parsed.data, __rowIndex: i + 2 });
  });

  // ---- Step 2: enum-map each row; unmapped values are reported and skipped ----
  const mappedRows: MappedRow[] = [];
  for (const r of validRows) {
    const email = r.Email.trim().toLowerCase();
    const ticketCategory = TICKET_TYPE_MAP[norm(r['Ticket Type'])];
    const status = STATUS_MAP[norm(r.Status)];
    const paymentStatus = PAYMENT_STATUS_MAP[norm(r['Payment Status'])];

    if (!ticketCategory) {
      report.unmappedEnumValues.push({ row: r.__rowIndex, email, field: 'Ticket Type', value: r['Ticket Type'] });
      continue;
    }
    if (!status) {
      report.unmappedEnumValues.push({ row: r.__rowIndex, email, field: 'Status', value: r.Status });
      continue;
    }
    if (!paymentStatus) {
      report.unmappedEnumValues.push({ row: r.__rowIndex, email, field: 'Payment Status', value: r['Payment Status'] });
      continue;
    }

    const notes = r.Notes ?? '';
    mappedRows.push({
      __rowIndex: r.__rowIndex,
      fullName: `${titleCase(r['First Name'])} ${titleCase(r['Last Name'])}`.trim(),
      email,
      phone: normalizePhone(r.Phone),
      organization: r.Company?.trim() || undefined,
      jobTitle: r['Job Title']?.trim() || undefined,
      ticketCategory,
      status,
      paymentStatus,
      dietaryRequirements: r['Dietary Requirements']?.trim() || undefined,
      tags: parseTags(r.Tags ?? ''),
      registeredAt: new Date(r['Registered At']),
      invoiceId: extractInvoiceId(notes),
      gatewayReference: extractGatewayReference(notes),
      rawNotes: notes.trim() || undefined,
    });
  }

  // ---- Step 3: resolve duplicate emails WITHIN this file ----
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
    const paid = group.find((r) => r.paymentStatus === 'paid');
    const winner = paid ?? group.slice().sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())[0];
    winners.push(winner);
    report.duplicateEmailGroupsInFile.push({
      email,
      keptRow: winner.__rowIndex,
      discardedRows: group.filter((r) => r !== winner).map((r) => r.__rowIndex),
    });
  }

  return { report, winners };
}

// The actual writes — split out from parseCsv() (which is pure/DB-free) so a
// test harness can call this repeatedly within a single DB connection.
// Mutates `report` in place.
export async function applyToDb(winners: MappedRow[], report: SyncReport): Promise<void> {
  for (const row of winners) {
    // .lean() deliberately — a hydrated Mongoose document auto-vivifies an
    // empty object for an unset single-nested-subdocument path (flootSync),
    // which makes `!existing.flootSync` always false and silently defeats the
    // non-Floot-conflict check below. A lean plain object faithfully reflects
    // whether flootSync actually exists in storage.
    const existing = await Registration.findOne({
      type: 'attendee',
      email: row.email,
    }).lean();

    if (!existing) {
      const isPaidOrComped = row.status === 'confirmed' || row.paymentStatus === 'paid';
      await Registration.create({
        type: 'attendee',
        registrationMode: 'individual',
        status: row.status,
        paymentStatus: row.paymentStatus,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        organization: row.organization,
        jobTitle: row.jobTitle,
        ticketCategory: row.ticketCategory,
        dietaryRequirements: row.dietaryRequirements,
        tags: row.tags,
        checkedIn: false, // deliberate — see file header comment
        qrToken: isPaidOrComped ? generateQrToken() : undefined,
        paidAt: row.paymentStatus === 'paid' ? row.registeredAt : undefined, // approximation — Floot has no separate paid-at column
        createdAt: row.registeredAt,
        flootSync: {
          importedAt: new Date(),
          lastSyncedAt: new Date(),
          lastKnownStatus: row.status,
          lastKnownPaymentStatus: row.paymentStatus,
          invoiceId: row.invoiceId,
          gatewayReference: row.gatewayReference,
          rawNotes: row.rawNotes,
        },
      });
      report.inserted.push({ email: row.email, fullName: row.fullName, status: row.status });
      continue;
    }

    if (!existing.flootSync) {
      report.skippedConflicts.push({
        email: row.email,
        reason: 'A registration for this email already exists in the new system but was not created by a Floot sync — left untouched.',
      });
      continue;
    }

    const changedFields: string[] = [];
    const set: Partial<RegistrationDoc> & Record<string, unknown> = {};

    // Floot-owned contact/detail fields — always refreshed.
    const alwaysRefresh: Array<[keyof MappedRow, keyof RegistrationDoc]> = [
      ['fullName', 'fullName'],
      ['phone', 'phone'],
      ['organization', 'organization'],
      ['jobTitle', 'jobTitle'],
      ['ticketCategory', 'ticketCategory'],
      ['dietaryRequirements', 'dietaryRequirements'],
      ['tags', 'tags'],
    ];
    for (const [fromKey, toKey] of alwaysRefresh) {
      const newValue = row[fromKey];
      const oldValue = (existing as Record<string, unknown>)[toKey as string];
      const changed = JSON.stringify(newValue ?? null) !== JSON.stringify(oldValue ?? null);
      if (changed) changedFields.push(toKey as string);
      set[toKey as string] = newValue;
    }

    // Guarded: only refresh status/paymentStatus if OUR side hasn't diverged
    // from what Floot last told us.
    const statusUnchangedSinceLastSync = existing.flootSync.lastKnownStatus === existing.status;
    const paymentUnchangedSinceLastSync = existing.flootSync.lastKnownPaymentStatus === existing.paymentStatus;

    if (statusUnchangedSinceLastSync) {
      if (row.status !== existing.status) changedFields.push('status');
      set.status = row.status;
    } else if (row.status !== existing.flootSync.lastKnownStatus) {
      report.skippedDivergedFields.push({ email: row.email, field: 'status', oursValue: existing.status, flootValue: row.status });
    }

    if (paymentUnchangedSinceLastSync) {
      if (row.paymentStatus !== existing.paymentStatus) changedFields.push('paymentStatus');
      set.paymentStatus = row.paymentStatus;
      if (row.paymentStatus === 'paid' && !existing.paidAt) set.paidAt = row.registeredAt;
    } else if (row.paymentStatus !== existing.flootSync.lastKnownPaymentStatus) {
      report.skippedDivergedFields.push({
        email: row.email,
        field: 'paymentStatus',
        oursValue: existing.paymentStatus ?? '',
        flootValue: row.paymentStatus,
      });
    }

    // A row that just newly became confirmed/paid via this sync earns a
    // ticket, same as the fresh-insert path — but never for a registration
    // whose (possibly independently-set, divergence-protected) status is
    // declined: status and paymentStatus are guarded independently above, so
    // a payment field can legitimately refresh to 'paid' on a declined row
    // without status itself changing, and that must never hand out a working
    // e-ticket.
    const effectiveStatus = set.status ?? existing.status;
    if (
      effectiveStatus !== 'declined' &&
      (set.status === 'confirmed' || set.paymentStatus === 'paid') &&
      !existing.qrToken
    ) {
      set.qrToken = generateQrToken();
      changedFields.push('qrToken');
    }

    set['flootSync.lastSyncedAt'] = new Date();
    set['flootSync.lastKnownStatus'] = row.status;
    set['flootSync.lastKnownPaymentStatus'] = row.paymentStatus;
    if (row.invoiceId) set['flootSync.invoiceId'] = row.invoiceId;
    if (row.gatewayReference) set['flootSync.gatewayReference'] = row.gatewayReference;
    if (row.rawNotes) set['flootSync.rawNotes'] = row.rawNotes;

    await Registration.updateOne({ _id: existing._id }, { $set: set });
    if (changedFields.length > 0) {
      report.updated.push({ email: row.email, changedFields });
    }
  }

  report.rowsMissingCountry = winners.length; // Floot's export has no Country column at all — every row is missing it
}

async function main() {
  const csvPath = path.resolve(fileArg!);
  const { report, winners } = parseCsv(csvPath, dryRun);

  if (dryRun) {
    printSummary(report, winners.length);
    writeReport(report, reportArg, csvPath);
    return;
  }

  // Connect (falls back to the local sandbox if MONGO_URI is unset — never
  // the real database by accident) and sync for real.
  await connectDB();
  await applyToDb(winners, report);
  await disconnectDB();

  printSummary(report, winners.length);
  writeReport(report, reportArg, csvPath);
}

function printSummary(report: SyncReport, resolvedRowCount: number) {
  console.log(`\n--- ${report.dryRun ? 'DRY RUN — no writes performed' : 'SYNC COMPLETE'} ---`);
  console.log(`Total rows in file:          ${report.totalRowsInFile}`);
  console.log(`Validation failures:         ${report.validationFailures.length}`);
  console.log(`Unmapped enum values:        ${report.unmappedEnumValues.length}`);
  console.log(`Duplicate email groups:      ${report.duplicateEmailGroupsInFile.length}`);
  console.log(`Rows resolved to sync:       ${resolvedRowCount}`);
  if (!report.dryRun) {
    console.log(`Inserted (new):              ${report.inserted.length}`);
    console.log(`Updated (already existed):   ${report.updated.length}`);
    console.log(`Skipped — non-Floot conflict: ${report.skippedConflicts.length}`);
    console.log(`Fields skipped — diverged:   ${report.skippedDivergedFields.length}`);
  }
  console.log(`Rows with no Country (Floot has no such column): ${report.rowsMissingCountry}`);
  if (report.validationFailures.length || report.unmappedEnumValues.length || report.skippedConflicts.length) {
    console.log('\n⚠️  Some rows need manual attention — see the full report.');
  }
}

function writeReport(report: SyncReport, reportArg: string | null, csvPath: string) {
  const reportPath = reportArg
    ? path.resolve(reportArg)
    : path.join(path.dirname(csvPath), `floot-sync-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to: ${reportPath}`);
}

if (isMain) {
  main().catch((err) => {
    logger.error({ err }, 'Floot sync failed');
    process.exit(1);
  });
}
