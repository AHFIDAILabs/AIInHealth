/**
 * scripts/generateFrontendTranslations.ts
 *
 * Batch-translates the frontend's static UI string dictionary
 * (frontend/src/i18n/en-source.json, a flat {key: "English text"} map built
 * up as pages are extracted for i18n) into French and Portuguese, writing
 * frontend/src/i18n/fr.json and pt.json. This is the "pre-generated and
 * stored, not live-translated per visitor request" half of AI Feature Suite
 * 2.4 (Multilingual) — these two JSON files ship as static build assets, no
 * Groq call ever happens at request time for this content.
 *
 * Incremental: only translates keys present in en-source.json but missing
 * from the target language file, so re-running after adding new keys is
 * fast/cheap and never re-touches already-reviewed translations. To force a
 * re-translation of a specific key (e.g. after editing its English text),
 * delete that key from fr.json/pt.json first.
 *
 * Usage:
 *   npx tsx src/scripts/generateFrontendTranslations.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { complete } from '../services/ai/groqClient.js';
import { runInBatches } from '../utils/batch.js';
import type { TranslationLang } from '../types/enums.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.resolve(__dirname, '../../../frontend/src/i18n');

const LANG_NAMES: Record<TranslationLang, string> = { fr: 'French', pt: 'Portuguese' };
// Tuned down from 25/3 after hitting this account's real TPM=8000 limit on a
// large (330+ key) batch — smaller requests at lower concurrency stay under
// it instead of bouncing off 429s and relying on next-run retries.
const BATCH_SIZE = 12; // keys per Groq call — keeps each prompt/response small and cheap
const CONCURRENCY = 2;

const readJson = (file: string): Record<string, string> => {
  const filePath = path.join(I18N_DIR, file);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJson = (file: string, data: Record<string, string>): void => {
  const filePath = path.join(I18N_DIR, file);
  const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
};

const translateBatch = async (
  entries: [string, string][],
  lang: TranslationLang
): Promise<Record<string, string>> => {
  const payload = Object.fromEntries(entries);
  const raw = await complete({
    feature: 'static-site-translation',
    model: env.GROQ_MODEL_STANDARD,
    messages: [
      {
        role: 'system',
        content: `You translate UI text for a health-technology summit's official public website (AI in Health Summit 2026, convened by AHFID with government and multilateral co-hosts) into formal, professional ${LANG_NAMES[lang]}. Preserve names, organizations, technical/medical terms, and any placeholder tokens like {{name}} exactly. Some strings contain markup tags like <styled>word</styled> (from react-i18next's Trans component) — keep the tags in the output, but you MAY move which word(s) they wrap to whatever position is grammatically correct in ${LANG_NAMES[lang]} (e.g. an adjective-noun order that reverses in translation) — the tags must still wrap a sensible, correctly-translated word or phrase, never end up empty or wrapping punctuation only. Respond with ONLY a JSON object mapping each given key to its translation — same keys, same structure, nothing added or removed.`,
      },
      { role: 'user', content: JSON.stringify(payload, null, 2) },
    ],
    maxTokens: 4000,
    responseFormat: 'json_object',
  });

  const parsed = JSON.parse(raw) as Record<string, string>;
  const missing = entries.filter(([k]) => typeof parsed[k] !== 'string');
  if (missing.length > 0) {
    logger.warn({ missing: missing.map(([k]) => k) }, 'generateFrontendTranslations: model dropped some keys in this batch');
  }
  return parsed;
};

const run = async (): Promise<void> => {
  // complete() (services/ai/groqClient.ts) unconditionally writes an
  // AIGenerationLog entry per call — this script has no other need for a DB
  // connection, but needs one open for that to succeed.
  await mongoose.connect(env.MONGO_URI);

  const source = readJson('en-source.json');
  const keys = Object.keys(source);
  console.log(`Source has ${keys.length} keys.`);

  for (const lang of ['fr', 'pt'] as TranslationLang[]) {
    const existing = readJson(`${lang}.json`);
    const missingEntries = keys.filter((k) => !(k in existing)).map((k) => [k, source[k]] as [string, string]);

    if (missingEntries.length === 0) {
      console.log(`[${lang}] Nothing new to translate (${Object.keys(existing).length} keys already present).`);
      continue;
    }
    console.log(`[${lang}] Translating ${missingEntries.length} new key(s)...`);

    const batches: [string, string][][] = [];
    for (let i = 0; i < missingEntries.length; i += BATCH_SIZE) batches.push(missingEntries.slice(i, i + BATCH_SIZE));

    const merged: Record<string, string> = { ...existing };
    const { failed } = await runInBatches(batches, CONCURRENCY, async (batch) => {
      const translated = await translateBatch(batch, lang);
      Object.assign(merged, translated);
    });

    if (failed.length > 0) {
      logger.error({ failedBatches: failed.length }, `[${lang}] Some batches failed — re-run this script to retry them (already-translated keys are preserved).`);
    }

    writeJson(`${lang}.json`, merged);
    console.log(`[${lang}] Wrote ${Object.keys(merged).length} total keys.`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
