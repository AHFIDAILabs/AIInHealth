/**
 * scripts/compendium/applyParsed.ts
 *
 * Phase 3 of the open-access compendium project — applies
 * compendium/import/parsed.json (from parseAbstracts.ts) onto the
 * ConfirmedAbstract collection. Matches by `code`. Idempotent: re-running
 * with the same parsed.json is a no-op once applied.
 *
 * Never sets consent or publication status — compendium.consentToPublish and
 * compendium.publicationStatus are never touched here at all; new records get
 * the schema's own defaults (unset/'none'), existing records keep whatever
 * they already have. Those are exclusively Phase 4 admin actions.
 *
 * For an EXISTING record (matched by code): only fills a field that is
 * currently empty/unset (abstractText, authors, keywords, and — notably —
 * track, since roughly two-thirds of the current records never got one from
 * the original tracker import). A field that already has a value is treated
 * as "an admin may have already edited this" and is left alone unless
 * --force-fields is passed. `title`/`authorName` are therefore effectively
 * never touched on an existing record by default, since they're always
 * already populated (required fields) — that's intentional, not an oversight.
 *
 * For a NEW code (not yet in ConfirmedAbstract): creates a record with
 * title/track/abstractText/authors/keywords from the parse, authorName set
 * to the first listed author (matching how authorName has always behaved —
 * a single display name, never the full list), and isPublished left at its
 * schema default of false — nothing here is ever auto-published.
 *
 * No AuditLog entries — recordAudit() requires an authenticated req.user,
 * which a CLI script doesn't have, and the existing precedent for exactly
 * this kind of bulk import (importConfirmedAbstracts.ts) has never called it
 * either; the dry-run diff below plus git history of parsed.json is this
 * script's audit trail instead. Flagged as a deliberate deviation from the
 * brief's literal "writes AuditLog entries" — not something recordAudit, as
 * currently built, can do from here.
 *
 * Usage:
 *   npx tsx src/scripts/compendium/applyParsed.ts                  # dry run
 *   npx tsx src/scripts/compendium/applyParsed.ts --apply          # real update
 *   npx tsx src/scripts/compendium/applyParsed.ts --apply --force-fields  # also overwrite already-set fields
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { ConfirmedAbstract } from '../../models/ConfirmedAbstract.model.js';
import type { ParsedAbstract } from './parseAbstracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARSED_PATH = path.join(__dirname, '..', '..', '..', 'compendium', 'import', 'parsed.json');

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const forceFields = args.includes('--force-fields');

// The PDF's own track numbers resolved to the CURRENT live Track names
// (post the agenda-rename migration earlier this project — see
// migrateSessionTrackToTracks.ts's sibling agenda work). Track 5 is included
// here, closing a gap in the original importConfirmedAbstracts.ts's own
// TRACK_MAP, which only ever covered 1-4 and left any Track-5 row unset.
const TRACK_MAP: Record<number, string> = {
  1: 'Country AI-in-Health Governance',
  2: 'Applied Clinical AI',
  3: 'Federated AI Systems & Data Sovereignty',
  4: 'Public Health Intelligence & Disease Programs',
  5: 'Local Innovation Ecosystems & Country-led AI Adoption',
};

interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

interface PlanItem {
  code: string;
  kind: 'create' | 'update' | 'skip';
  changes: FieldChange[];
  skippedFields: string[]; // already-set fields left alone (not --force-fields)
}

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function buildAuthorsPayload(parsed: ParsedAbstract): { name: string; isCorresponding?: boolean }[] {
  return parsed.authors.map((a) => (a.isCorresponding ? { name: a.name, isCorresponding: true } : { name: a.name }));
}

async function buildPlan(parsedAbstracts: ParsedAbstract[]): Promise<PlanItem[]> {
  const plan: PlanItem[] = [];

  for (const parsed of parsedAbstracts) {
    const track = parsed.trackNumber ? TRACK_MAP[parsed.trackNumber] : undefined;
    if (parsed.trackNumber && !track) {
      logger.warn({ code: parsed.code, trackNumber: parsed.trackNumber }, 'Unmapped track number — leaving track unset');
    }

    const existing = await ConfirmedAbstract.findOne({ code: parsed.code });

    if (!existing) {
      plan.push({
        code: parsed.code,
        kind: 'create',
        changes: [
          { field: 'title', before: undefined, after: parsed.title },
          { field: 'authorName', before: undefined, after: parsed.authors[0]?.name ?? '(unknown)' },
          { field: 'track', before: undefined, after: track },
          { field: 'abstractText', before: undefined, after: `${parsed.abstractText.length} chars` },
          { field: 'authors', before: undefined, after: `${parsed.authors.length} author(s)` },
          { field: 'keywords', before: undefined, after: parsed.keywords },
        ],
        skippedFields: [],
      });
      continue;
    }

    const changes: FieldChange[] = [];
    const skippedFields: string[] = [];

    const maybeApply = (field: string, currentValue: unknown, newValue: unknown, displayAfter?: unknown) => {
      if (isEmpty(newValue)) return;
      if (!isEmpty(currentValue) && !forceFields) {
        skippedFields.push(field);
        return;
      }
      changes.push({ field, before: currentValue, after: displayAfter ?? newValue });
    };

    maybeApply('track', existing.track, track, track);
    maybeApply('abstractText', existing.get('abstractText'), parsed.abstractText, `${parsed.abstractText.length} chars`);
    maybeApply('authors', existing.get('authors'), parsed.authors, `${parsed.authors.length} author(s)`);
    maybeApply('keywords', existing.get('keywords'), parsed.keywords, parsed.keywords);

    plan.push({ code: parsed.code, kind: changes.length > 0 ? 'update' : 'skip', changes, skippedFields });
  }

  return plan;
}

async function applyPlan(plan: PlanItem[], parsedByCode: Map<string, ParsedAbstract>): Promise<void> {
  for (const item of plan) {
    const parsed = parsedByCode.get(item.code);
    if (!parsed) continue;
    const track = parsed.trackNumber ? TRACK_MAP[parsed.trackNumber] : undefined;

    if (item.kind === 'create') {
      // eslint-disable-next-line no-await-in-loop
      await ConfirmedAbstract.create({
        code: parsed.code,
        authorName: parsed.authors[0]?.name ?? '(unknown)',
        title: parsed.title,
        track,
        abstractText: parsed.abstractText,
        authors: buildAuthorsPayload(parsed),
        keywords: parsed.keywords,
      });
      continue;
    }

    if (item.kind === 'update') {
      const set: Record<string, unknown> = {};
      for (const change of item.changes) {
        if (change.field === 'authors') set.authors = buildAuthorsPayload(parsed);
        else if (change.field === 'track') set.track = track;
        else if (change.field === 'abstractText') set.abstractText = parsed.abstractText;
        else if (change.field === 'keywords') set.keywords = parsed.keywords;
      }
      if (Object.keys(set).length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await ConfirmedAbstract.updateOne({ code: item.code }, { $set: set });
      }
    }
  }
}

function printPlan(plan: PlanItem[]): void {
  const creates = plan.filter((p) => p.kind === 'create');
  const updates = plan.filter((p) => p.kind === 'update');
  const skips = plan.filter((p) => p.kind === 'skip');

  console.log(`\n--- ${apply ? 'APPLYING' : 'DRY RUN'}${forceFields ? ' (--force-fields)' : ''} ---\n`);
  console.log(`Creates: ${creates.length} | Updates: ${updates.length} | No changes needed: ${skips.length}\n`);

  if (creates.length > 0) {
    console.log('=== New ConfirmedAbstract records ===');
    for (const item of creates) {
      console.log(`\n${item.code}`);
      for (const c of item.changes) console.log(`  + ${c.field}: ${JSON.stringify(c.after)}`);
    }
    console.log('');
  }

  if (updates.length > 0) {
    console.log('=== Updates to existing records ===');
    for (const item of updates) {
      console.log(`\n${item.code}`);
      for (const c of item.changes) console.log(`  ~ ${c.field}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
      if (item.skippedFields.length > 0) {
        console.log(`  (left alone, already set — pass --force-fields to overwrite: ${item.skippedFields.join(', ')})`);
      }
    }
    console.log('');
  }

  const skipsWithSkippedFields = skips.filter((p) => p.skippedFields.length > 0);
  if (skipsWithSkippedFields.length > 0) {
    console.log(`=== Already fully populated (nothing to add) — ${skipsWithSkippedFields.length} record(s) ===`);
    console.log(skipsWithSkippedFields.map((p) => p.code).join(', '));
    console.log('');
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(PARSED_PATH)) {
    console.error(`parsed.json not found at ${PARSED_PATH} — run parseAbstracts.ts first.`);
    process.exit(1);
  }
  const parsedAbstracts: ParsedAbstract[] = JSON.parse(fs.readFileSync(PARSED_PATH, 'utf-8'));
  const parsedByCode = new Map(parsedAbstracts.map((p) => [p.code, p]));

  await connectDB();
  const plan = await buildPlan(parsedAbstracts);
  printPlan(plan);

  if (apply) {
    await applyPlan(plan, parsedByCode);
    console.log('Applied.');
  } else {
    console.log('No writes performed. Re-run with --apply to perform these changes.');
  }

  await disconnectDB();
}

if (isMain) {
  main().catch(async (err) => {
    logger.error({ err }, 'applyParsed failed');
    await disconnectDB();
    process.exit(1);
  });
}
