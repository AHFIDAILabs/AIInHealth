import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { WaiHealthRegistration, type WaiHealthRegistrationDoc } from '../models/WaiHealthRegistration.model.js';
import { getOrCreateOnevieWaiSettings } from '../models/OnevieWaiSettings.model.js';
import { onevieWaiConfigured, syncWaiRegistrationToOnevie } from '../services/onevieWai.service.js';
import { OnevieApiError } from '../services/onevie.service.js';
import type { HydratedDocument } from 'mongoose';

// Pushes confirmed, non-declined WAI-Health Breakfast RSVPs to the vendor's
// SEPARATE "AIHS-women delegate sync" event — see
// AIHS-women delegate sync.md and services/onevieWai.service.ts. Much
// simpler than onevieSync.job.ts: one collection, one ticket type, and no
// cross-sibling email-conflict resolution needed (WaiHealthRegistration
// already enforces one row per email at signup, unlike Registration's
// several distinct collections that can legitimately share an email).
//
// "Needs (re)sync" mirrors the main job exactly: never synced yet, OR edited
// since the last successful sync — comparing timestamps, not reading
// onevieWaiSync.status, for the same reason (don't need to hook every place
// that could touch this document).
let running = false;

const needsSyncFilter = {
  rsvpConfirmedAt: { $exists: true },
  declined: { $ne: true },
  checkinQrToken: { $exists: true, $ne: null },
  $expr: {
    $or: [{ $eq: [{ $ifNull: ['$onevieWaiSync.syncedAt', null] }, null] }, { $gt: ['$updatedAt', '$onevieWaiSync.syncedAt'] }],
  },
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface SyncOneResult {
  ok: boolean;
  rateLimited: boolean;
}

const syncOne = async (registration: HydratedDocument<WaiHealthRegistrationDoc>): Promise<SyncOneResult> => {
  const attemptedAt = new Date();
  try {
    await syncWaiRegistrationToOnevie(registration);
    registration.onevieWaiSync = { status: 'synced', syncedAt: attemptedAt, lastAttemptAt: attemptedAt, lastError: undefined };
    registration.markModified('onevieWaiSync');
    await registration.save();
    return { ok: true, rateLimited: false };
  } catch (err) {
    const message = err instanceof OnevieApiError ? `[${err.status}] ${err.message}` : (err as Error).message;
    registration.onevieWaiSync = { ...registration.onevieWaiSync, status: 'failed', lastAttemptAt: attemptedAt, lastError: message.slice(0, 500) };
    registration.markModified('onevieWaiSync');
    await registration.save();
    return { ok: false, rateLimited: err instanceof OnevieApiError && err.status === 429 };
  }
};

// Same serial-with-decaying-delay shape as onevieSync.job.ts — that job
// learned the hard way (429s at both 3-concurrent and 2-concurrent/500ms)
// that Onevie's real limit is tighter than it looks; reusing the exact same
// constants/behavior here rather than re-discovering it on this event too.
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

const syncAll = async (candidates: HydratedDocument<WaiHealthRegistrationDoc>[]): Promise<{ succeeded: number; failed: number }> => {
  let succeeded = 0;
  let failed = 0;
  let delay = BASE_DELAY_MS;

  for (let i = 0; i < candidates.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await syncOne(candidates[i]);
    if (result.ok) succeeded += 1;
    else failed += 1;

    delay = result.rateLimited ? Math.min(delay * 2, MAX_DELAY_MS) : Math.max(delay * 0.8, BASE_DELAY_MS);
    if (i + 1 < candidates.length) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
  }

  return { succeeded, failed };
};

export const runOnevieWaiSync = async (): Promise<{ skipped: boolean; synced: number; failed: number; durationMs: number }> => {
  if (running) {
    logger.warn('onevieWaiSync: previous run still in progress, skipping this tick');
    return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
  }
  running = true;
  const startedAt = Date.now();

  try {
    const settings = await getOrCreateOnevieWaiSettings();
    if (!settings.isEnabled) {
      logger.debug('onevieWaiSync: disabled in admin settings, skipping');
      return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
    }
    if (!onevieWaiConfigured) {
      logger.warn('onevieWaiSync: enabled but ONEVIE_WAI_API_KEY is unset — nothing to do');
      return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
    }

    const candidates = await WaiHealthRegistration.find(needsSyncFilter);
    const { succeeded, failed } = await syncAll(candidates);

    const durationMs = Date.now() - startedAt;
    settings.set({ lastRunAt: new Date(), lastRunSynced: succeeded, lastRunFailed: failed, lastRunDurationMs: durationMs });
    await settings.save();

    if (failed > 0) {
      logger.warn({ failedCount: failed }, 'onevieWaiSync: some registrations failed to sync this run');
    }

    return { skipped: false, synced: succeeded, failed, durationMs };
  } finally {
    running = false;
  }
};

export const scheduleOnevieWaiSync = (): void => {
  // Every 5 minutes, same cadence as the main Onevie sync — WAI RSVP volume
  // is much lower, but there's no reason for check-in access to lag behind
  // a fresh confirmation any more than the main door does.
  cron.schedule('*/5 * * * *', () => {
    runOnevieWaiSync().catch((err) => logger.error({ err }, 'Onevie WAI sync job failed'));
  });
  logger.info('Onevie WAI-Health check-in sync job scheduled (every 5 minutes, admin-togglable)');
};

export const runOnevieWaiSyncNow = runOnevieWaiSync;
