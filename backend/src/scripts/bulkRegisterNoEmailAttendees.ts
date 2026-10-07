import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';
import { generateQrToken } from '../services/qr.service.js';
import { sendConfirmationAndTicketEmails } from '../services/registrationNotification.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { isFreeTicketCategory, priceForRegistration } from '../config/pricing.js';
import { TICKET_CATEGORIES, type TicketCategory } from '../types/enums.js';

// One-off bulk entry for walk-ins/known attendees who have no email address on
// file (so the public form and the admin "Add Registration" modal — both of
// which require a real, unique email per attendeeSchema/adminAttendeeSchema —
// can't be used for them as-is). Registration.model.ts's partial unique index
// on {type, email} also means you genuinely cannot reuse ONE literal address
// across multiple rows; this generates a plus-addressed variant of YOUR OWN
// real email per person instead (e.g. you+janedoe3@yourdomain.com). Every
// major provider (Gmail, Outlook, etc.) treats that as a distinct, valid
// address that still lands in your inbox, so the unique index is satisfied
// for real and each attendee's own confirmation + QR ticket email (sent the
// same way adminCreate's admin-vouched path sends it) arrives for you to
// forward or print — nothing about the live app changes, no new feature,
// no admin-permission change, no loophole: this is the exact same
// "admin registers someone directly, confirmed immediately" path
// registration.controller.ts's adminCreate already exposes, just run here in
// bulk against a CSV instead of 20 manual form submissions.
//
// Defaults to a dry run (prints what WOULD be created, writes nothing, sends
// no email) — pass --apply to actually create the registrations and send the
// ticket emails. Same shared production database every other script in this
// repo points at — review the dry-run output closely before --apply.
//
// CSV columns (header row required, case-insensitive):
//   fullName         required
//   ticketCategory   required — one of: international_delegate, nigerian_professional,
//                    student_researcher, vip, government_official, accredited_media,
//                    staff, abstract_presenter, abstract_reviewer, speaker
//   phone            optional
//   organization     optional
//   jobTitle         optional
//   country          optional
//   comp             optional — "yes"/"true" fully comps a PAID category (sets a
//                    100% discount, same as an admin-granted scholarship)
//   paidAmountNaira  optional — records a real manual payment (bank transfer/cash)
//                    already collected for a PAID category; takes priority over
//                    comp if both are set on the same row, same precedence
//                    adminCreate itself uses for "manual payment vs. comp"
// A row whose ticketCategory is already free (e.g. 'staff') needs neither
// column. A row whose category is paid needs exactly one of the two, or it's
// reported as skipped rather than guessed at.
//
// Usage:
//   npx tsx src/scripts/bulkRegisterNoEmailAttendees.ts --file=./people.csv --email=you@yourdomain.com          # dry run
//   npx tsx src/scripts/bulkRegisterNoEmailAttendees.ts --file=./people.csv --email=you@yourdomain.com --apply  # real run

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fileArg = args.find((a) => a.startsWith('--file='))?.slice('--file='.length);
const emailArg = args.find((a) => a.startsWith('--email='))?.slice('--email='.length);

interface SourceRow {
  rowNum: number;
  fullName: string;
  ticketCategory: TicketCategory;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  country?: string;
  comp: boolean;
  paidAmountNaira?: number;
}

type Branch = 'free' | 'comped' | 'manual_paid';

interface PlannedRow extends SourceRow {
  email: string;
  branch: Branch;
}

interface SkippedRow {
  rowNum: number;
  fullName: string;
  reason: string;
}

// Keeps the generated local-part short and readable (e.g. "+janedoe3") rather
// than a bare row number — the row number alone still guarantees uniqueness
// within this run, the slug is just so you can tell rows apart at a glance in
// your inbox later.
const slugify = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'person';

const splitEmail = (email: string): { local: string; domain: string } => {
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) throw new Error(`"${email}" doesn't look like a valid email address.`);
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
};

const readRows = (filePath: string): SourceRow[] => {
  const raw = readFileSync(filePath, 'utf-8');
  const records: Record<string, string>[] = parse(raw, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record, i) => {
    const rowNum = i + 2; // header is row 1

    const fullName = record.fullname?.trim();
    if (!fullName || fullName.length < 2) throw new Error(`Row ${rowNum}: missing or invalid fullName`);

    const ticketCategoryRaw = record.ticketcategory?.trim();
    if (!ticketCategoryRaw || !(TICKET_CATEGORIES as readonly string[]).includes(ticketCategoryRaw)) {
      throw new Error(`Row ${rowNum}: ticketCategory must be one of ${TICKET_CATEGORIES.join(', ')} — got "${ticketCategoryRaw ?? ''}"`);
    }

    const compRaw = record.comp?.trim().toLowerCase();
    const comp = compRaw === 'yes' || compRaw === 'true' || compRaw === '1';

    const paidAmountRaw = record.paidamountnaira?.trim();
    let paidAmountNaira: number | undefined;
    if (paidAmountRaw) {
      paidAmountNaira = Number(paidAmountRaw);
      if (Number.isNaN(paidAmountNaira) || paidAmountNaira <= 0) {
        throw new Error(`Row ${rowNum}: paidAmountNaira must be a positive number — got "${paidAmountRaw}"`);
      }
    }

    return {
      rowNum,
      fullName: fullName.replace(/\s+/g, ' '),
      ticketCategory: ticketCategoryRaw as TicketCategory,
      phone: record.phone?.trim() || undefined,
      organization: record.organization?.trim() || undefined,
      jobTitle: record.jobtitle?.trim() || undefined,
      country: record.country?.trim() || undefined,
      comp,
      paidAmountNaira,
    };
  });
};

export const run = async (): Promise<void> => {
  if (!fileArg || !emailArg) {
    console.error(
      'Usage: npx tsx src/scripts/bulkRegisterNoEmailAttendees.ts --file=<path.csv> --email=<your real email> [--apply]'
    );
    process.exitCode = 1;
    return;
  }

  const { local, domain } = splitEmail(emailArg);

  let rows: SourceRow[];
  try {
    rows = readRows(fileArg);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const planned: PlannedRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const row of rows) {
    const email = `${local}+${slugify(row.fullName)}${row.rowNum}@${domain}`.toLowerCase();

    const existing = await Registration.findOne({ type: 'attendee', email }).select('_id').lean();
    if (existing) {
      skipped.push({
        rowNum: row.rowNum,
        fullName: row.fullName,
        reason: `A registration with ${email} already exists (id ${existing._id}) — this row was probably already run.`,
      });
      continue;
    }

    const isFree = isFreeTicketCategory(row.ticketCategory);
    // Manual payment wins over comp if a row somehow sets both — same
    // precedence registration.controller.ts's adminCreate uses (a real,
    // already-collected fee implies money changed hands, so it takes
    // priority over a free comp).
    if (row.paidAmountNaira !== undefined) {
      planned.push({ ...row, email, branch: 'manual_paid' });
    } else if (row.comp) {
      planned.push({ ...row, email, branch: 'comped' });
    } else if (isFree) {
      planned.push({ ...row, email, branch: 'free' });
    } else {
      skipped.push({
        rowNum: row.rowNum,
        fullName: row.fullName,
        reason: `"${row.ticketCategory}" is a paid category (₦${priceForRegistration(row.ticketCategory, 1).toLocaleString()}) — add comp=yes or a paidAmountNaira value for this row.`,
      });
    }
  }

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — ${planned.length} of ${rows.length} row(s) ready, ${skipped.length} skipped:\n`);
  for (const p of planned) {
    const detail =
      p.branch === 'comped'
        ? 'confirmed, fully comped'
        : p.branch === 'manual_paid'
          ? `confirmed, paid ₦${p.paidAmountNaira!.toLocaleString()} (manual)`
          : 'confirmed, free category';
    console.log(`  [${p.rowNum}] ${p.fullName} <${p.email}> — ${p.ticketCategory}, ${detail}`);
  }
  if (skipped.length > 0) {
    console.log('\nSkipped:');
    for (const s of skipped) console.log(`  [${s.rowNum}] ${s.fullName} — ${s.reason}`);
  }

  if (!apply) {
    console.log('\nNo writes performed, no emails sent. Re-run with --apply once this list looks right.');
    await disconnectDB();
    return;
  }

  console.log('');
  let created = 0;
  for (const p of planned) {
    try {
      const doc: Record<string, unknown> = {
        type: 'attendee',
        registrationMode: 'individual',
        ticketCategory: p.ticketCategory,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        organization: p.organization,
        jobTitle: p.jobTitle,
        country: p.country,
        status: 'confirmed',
        qrToken: generateQrToken(),
      };
      if (p.branch === 'comped') {
        doc.discountPercent = 100;
        doc.paymentStatus = 'not_required';
      } else if (p.branch === 'manual_paid') {
        doc.paymentStatus = 'paid';
        doc.paymentMethod = 'manual';
        doc.paymentNote = 'Bulk-entered by admin — attendee has no email on file.';
        doc.paymentReference = `MANUAL-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
        doc.amountKobo = Math.round(p.paidAmountNaira! * 100);
        doc.paidAt = new Date();
      } else {
        doc.paymentStatus = 'not_required';
      }

      const registration = await Registration.create(doc);

      await emitAdminNotification({
        type: 'registration.new',
        title: 'New attendee registration (bulk, sans email)',
        body: p.fullName,
        resourceType: 'Registration',
        resourceId: registration.id,
      });

      // Sequential, not parallel — the mailbox provider throttles past a
      // handful of concurrent sends, and 20 one-at-a-time sends is already
      // what 20 separate admin UI submissions would do anyway.
      const sent = await sendConfirmationAndTicketEmails(
        registration,
        p.branch === 'manual_paid' ? { amountNaira: p.paidAmountNaira } : undefined
      );

      console.log(`  [${p.rowNum}] Created ${registration.id} <${p.email}> — ticket email ${sent ? 'sent' : 'FAILED to send'}`);
      created += 1;
    } catch (err) {
      console.error(`  [${p.rowNum}] ${p.fullName} FAILED:`, (err as Error).message);
    }
  }

  console.log(`\nDone — ${created} of ${planned.length} registration(s) created.`);
  await disconnectDB();
};

if (isMain) {
  run().catch((err) => {
    logger.error({ err }, 'bulkRegisterNoEmailAttendees failed');
    process.exit(1);
  });
}
