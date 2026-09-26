import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { PolicySource } from '../models/PolicySource.model.js';
import { PolicyTrackerEntry } from '../models/PolicyTrackerEntry.model.js';
import { fetchPageText } from '../utils/fetchPageText.js';
import { extractPolicyFacts } from '../services/ai/policyExtraction.service.js';
import { runInBatches } from '../utils/batch.js';

// AI Feature Suite 2.5 (Global AI-in-Health Policy Tracker). Deliberately
// NOT live agentic web browsing (Section 0.4) — this fetches each
// admin-maintained trusted source's page text (utils/fetchPageText.ts, a
// plain HTTP GET, no JS rendering, no link-following) and asks Groq to
// extract facts from THAT TEXT ONLY, never from outside knowledge. Slower to
// update than a live search would be; that's the intended tradeoff for a
// page making factual claims about government policy on a platform
// representing a ministerial convening — see PolicyTrackerEntry.model.ts and
// the public list()'s approved-only gate in policyTracker.controller.ts.
//
// Concurrency 2 (not full parallel): these are real external government/WHO
// sites, not our own infrastructure — no reason to hit them harder than a
// person clicking through a few tabs would.
const runRefresh = async (): Promise<{ checked: number; changed: number; failed: number }> => {
  const sources = await PolicySource.find({ isActive: true });
  let changed = 0;

  const { failed } = await runInBatches(sources, 2, async (source) => {
    const pageText = await fetchPageText(source.url);
    const facts = await extractPolicyFacts({ country: source.country, pageText });
    if (!facts) throw new Error('Extraction failed or returned no usable facts');

    const existing = await PolicyTrackerEntry.findOne({ country: source.country, sourceUrl: source.url });
    // Only frameworkStatus (the actual classification) counts as a material
    // change — comparing the freeform `summary` text verbatim was tried and
    // dropped: an LLM regenerates slightly different wording on essentially
    // every call even when the underlying facts and page are identical, so
    // that comparison flagged nearly every weekly re-check as "changed" and
    // defeated the entire point of this optimization (never re-reviewing
    // something that hasn't actually changed).
    const materiallyChanged = !existing || existing.frameworkStatus !== facts.frameworkStatus;
    if (materiallyChanged) changed += 1;

    await PolicyTrackerEntry.findOneAndUpdate(
      { country: source.country, sourceUrl: source.url },
      {
        country: source.country,
        sourceUrl: source.url,
        lastCheckedAt: new Date(),
        // Only touch frameworkStatus/summary/status when the classification
        // actually changed. An unchanged re-check leaves an already-approved
        // entry's PUBLIC-FACING TEXT untouched too, not just its status —
        // otherwise the summary could get silently reworded on the live site
        // without ever passing back through admin review, even though
        // nothing about the underlying facts changed. Anything genuinely new
        // or different always drops back to pending_review for a fresh
        // look, even if it was previously approved or rejected.
        ...(materiallyChanged
          ? { frameworkStatus: facts.frameworkStatus, summary: facts.summary, status: 'pending_review', reviewedBy: undefined }
          : {}),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  });

  for (const f of failed) {
    logger.error({ err: f.error, source: (f.item as { url: string }).url }, 'policyTrackerRefresh: source failed');
  }

  return { checked: sources.length, changed, failed: failed.length };
};

export const schedulePolicyTrackerRefresh = (): void => {
  // Weekly — Monday 03:00 UTC, well outside anyone's working hours here or
  // at the source sites.
  cron.schedule('0 3 * * 1', () => {
    runRefresh().catch((err) => logger.error({ err }, 'Policy tracker refresh job failed'));
  });
  logger.info('Policy tracker refresh job scheduled (weekly, Monday 03:00 UTC)');
};

export const runPolicyTrackerRefreshNow = runRefresh;
