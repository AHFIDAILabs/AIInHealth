/**
 * scripts/compendium/exportSnapshot.ts
 *
 * Phase 5 of the open-access compendium project — the single frozen,
 * versioned export shared with whoever builds the PDF version. Reads only
 * `ConfirmedAbstract` records with consent recorded AND a publication status
 * of 'published' or 'withdrawn' (set via the admin Compendium tab, Phase 4 —
 * nothing here ever changes either of those).
 *
 * This is a CLI script a human runs locally (not a backend HTTP endpoint),
 * writing directly into frontend/public/compendium/ — matching this
 * project's documented publishing flow: export, review the diff, commit
 * those files, push, Render redeploys. Render's own backend disk is
 * ephemeral, so nothing here is ever meant to persist there; the person
 * running this script is the one with git access, same as every other
 * migration script in this codebase.
 *
 * Writes (version increments only on a real --apply run — a dry run
 * previews the next version number without bumping anything):
 *   - edition.json              (merged with whatever already exists on disk
 *                                 — never clobbers facts a human already
 *                                 filled in; see mergeEdition below)
 *   - compendium-<version>.json (the allowlisted records themselves)
 *   - search-index-<version>.json (a prebuilt MiniSearch index, published
 *                                 records only — a withdrawn record's text
 *                                 is gone, so there's nothing left to index)
 *   - current.json              ({ version, file, generatedAt })
 *
 * On --apply, also stamps each exported record's compendium.publishedInVersion
 * in the DB — the one compendium.* field this script, not the admin UI, owns.
 *
 * Usage:
 *   npx tsx src/scripts/compendium/exportSnapshot.ts          # dry run
 *   npx tsx src/scripts/compendium/exportSnapshot.ts --apply  # writes files + stamps version
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MiniSearch from 'minisearch';
import { connectDB, disconnectDB } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { EVENT_END_DATE } from '../../config/event.js';
import { ConfirmedAbstract, type ConfirmedAbstractDoc } from '../../models/ConfirmedAbstract.model.js';
import { sanitizeAbstractHtml } from './sanitizeAbstractHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', '..', '..', '..', 'frontend', 'public', 'compendium');

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
const apply = process.argv.slice(2).includes('--apply');

export interface ExportedAuthor {
  name: string;
  affiliation: string | null;
  isCorresponding: boolean | null;
  orcid: string | null;
}

// The explicit allowlist — this exact key set, nothing more. A withdrawn
// record only ever gets the first three keys plus status; every other key
// is simply absent (not null — absent), so there is no question of a
// forgotten blank field accidentally carrying stale content forward.
export interface ExportedAbstract {
  code: string;
  title: string;
  status: 'published' | 'withdrawn';
  authors?: ExportedAuthor[];
  abstract?: string;
  keywords?: string[];
  track?: string | null;
  presentationType?: string | null;
  sessionRef?: string | null;
  language?: string;
  corrections?: { date: string; note: string }[];
}

export interface Edition {
  editionTitle: string | null;
  editionYear: number;
  version: string;
  publishedAt: string | null;
  publisher: string | null;
  licence: { name: string; url: string; confirmed: boolean };
  doi: string | null;
  isbn: string | null;
  pdfUrl: string | null;
  editors: string[];
  foreword: string | null;
  showPlainSummaries: boolean;
}

// Never invented — the facts here are genuinely unknown until AHFID supplies
// them, and the UI is expected to omit whatever is still null. The one
// exception the brief itself calls out: a CC BY 4.0 licence default, flagged
// for a human to actively confirm rather than silently trust.
const DEFAULT_EDITION: Edition = {
  editionTitle: null,
  editionYear: EVENT_END_DATE.getFullYear(),
  version: '0',
  publishedAt: null,
  publisher: null,
  licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', confirmed: false }, // CONFIRM WITH AHFID
  doi: null,
  isbn: null,
  pdfUrl: null,
  editors: [],
  foreword: null,
  showPlainSummaries: false,
};

// Merges onto whatever edition.json already exists on disk rather than
// overwriting it — a human may have already filled in the real title, DOI,
// editors, etc. between runs, and this must never clobber that. Only
// version/publishedAt are ever computed fresh by this script itself.
function mergeEdition(existing: Partial<Edition> | null, version: string, publishedAt: string | null): Edition {
  return { ...DEFAULT_EDITION, ...existing, version, publishedAt };
}

export function buildExportRecord(doc: ConfirmedAbstractDoc): ExportedAbstract {
  const status = doc.compendium?.publicationStatus as 'published' | 'withdrawn';

  if (status === 'withdrawn') {
    // "exports title and code only, with the text removed" — deliberately
    // not even an empty-string placeholder for the stripped fields; they're
    // simply absent from the object.
    return { code: doc.code, title: doc.title, status: 'withdrawn' };
  }

  const authors: ExportedAuthor[] = (doc.authors ?? []).map((a) => ({
    name: a.name,
    affiliation: a.affiliation ?? null,
    isCorresponding: a.isCorresponding ?? null,
    orcid: a.orcid ?? null,
  }));

  return {
    code: doc.code,
    title: doc.title,
    status: 'published',
    authors,
    abstract: sanitizeAbstractHtml(doc.abstractText ?? ''),
    keywords: doc.keywords ?? [],
    track: doc.track ?? null,
    presentationType: doc.presentationType ?? null,
    // No field on this model (or any other) links a confirmed abstract to a
    // specific agenda Session — poster/oral abstracts are grouped into
    // broader named sessions ("Oral Abstracts 1", "Poster Walk"), not 1:1
    // mapped, so there is nothing reliable to compute here. Always null
    // until a real linkage mechanism exists; never guessed from a title
    // match.
    sessionRef: null,
    language: doc.language ?? 'en',
    corrections: (doc.compendium?.corrections ?? []).map((c) => ({
      date: (c.date as Date).toISOString(),
      note: c.note,
    })),
  };
}

function buildSearchIndex(records: ExportedAbstract[]): object {
  const mini = new MiniSearch<{ id: string; title: string; authors: string; keywords: string; abstract: string }>({
    fields: ['title', 'authors', 'keywords', 'abstract'],
    storeFields: ['title'],
    idField: 'id',
  });
  const searchable = records
    .filter((r) => r.status === 'published')
    .map((r) => ({
      id: r.code,
      title: r.title,
      authors: (r.authors ?? []).map((a) => a.name).join(' '),
      keywords: (r.keywords ?? []).join(' '),
      abstract: r.abstract ?? '',
    }));
  mini.addAll(searchable);
  return mini.toJSON();
}

async function main(): Promise<void> {
  await connectDB();

  const eligible = await ConfirmedAbstract.find({
    'compendium.consentToPublish.granted': true,
    'compendium.publicationStatus': { $in: ['published', 'withdrawn'] },
  });

  const totalRecords = await ConfirmedAbstract.countDocuments();
  console.log(`\n--- ${apply ? 'APPLYING' : 'DRY RUN'} ---\n`);
  console.log(`${eligible.length} of ${totalRecords} abstracts are eligible (consent recorded AND status published/withdrawn).`);
  if (eligible.length === 0) {
    console.log('Nothing is eligible yet — this edition will be empty until an admin records consent and marks at least one abstract "Published" or "Withdrawn" from the Compendium tab.');
  }

  const exported = eligible.map(buildExportRecord);
  const published = exported.filter((r) => r.status === 'published').length;
  const withdrawn = exported.filter((r) => r.status === 'withdrawn').length;
  console.log(`  -> ${published} published, ${withdrawn} withdrawn (tombstoned, text removed)`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const currentPath = path.join(OUT_DIR, 'current.json');
  const existingCurrent = fs.existsSync(currentPath) ? JSON.parse(fs.readFileSync(currentPath, 'utf-8')) : null;
  const currentVersionNum = existingCurrent ? Number(existingCurrent.version) : 0;
  const nextVersion = String(currentVersionNum + 1);

  const editionPath = path.join(OUT_DIR, 'edition.json');
  const existingEdition = fs.existsSync(editionPath) ? JSON.parse(fs.readFileSync(editionPath, 'utf-8')) : null;

  console.log(`\nNext version: ${nextVersion}${existingCurrent ? ` (currently ${existingCurrent.version})` : ' (first edition)'}`);
  if (!existingEdition?.editionTitle) console.log('  NOTE: edition.json has no editionTitle yet — still needed from AHFID before this is publishable.');
  if (!existingEdition?.licence?.confirmed) console.log('  NOTE: licence defaults to CC BY 4.0 but is NOT yet confirmed — see edition.json\'s licence.confirmed flag.');

  if (!apply) {
    console.log('\nNo files written. Re-run with --apply to write the snapshot and stamp publishedInVersion on exported records.');
    await disconnectDB();
    return;
  }

  const publishedAt = new Date().toISOString();
  const edition = mergeEdition(existingEdition, nextVersion, publishedAt);
  const searchIndex = buildSearchIndex(exported);
  const compendiumFile = `compendium-${nextVersion}.json`;

  fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, compendiumFile), JSON.stringify(exported, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, `search-index-${nextVersion}.json`), JSON.stringify(searchIndex), 'utf-8');
  fs.writeFileSync(currentPath, JSON.stringify({ version: nextVersion, file: compendiumFile, generatedAt: publishedAt }, null, 2), 'utf-8');

  await ConfirmedAbstract.updateMany(
    { _id: { $in: eligible.map((d) => d._id) } },
    { $set: { 'compendium.publishedInVersion': nextVersion } }
  );

  console.log(`\nWrote ${OUT_DIR}:`);
  console.log(`  - edition.json`);
  console.log(`  - ${compendiumFile}`);
  console.log(`  - search-index-${nextVersion}.json`);
  console.log(`  - current.json`);
  console.log(`\nNext: review these files, then commit them into frontend/public/compendium/ and push.`);

  await disconnectDB();
}

if (isMain) {
  main().catch(async (err) => {
    logger.error({ err }, 'exportSnapshot failed');
    await disconnectDB();
    process.exit(1);
  });
}
