import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { getOrCreateOnevieSettings } from '../models/OnevieSettings.model.js';
import { runInBatches } from '../utils/batch.js';
import { onevieConfigured, syncRegistrationToOnevie, mapOnevieTicketTypeId, OnevieApiError } from '../services/onevie.service.js';
import type { HydratedDocument } from 'mongoose';

// Pushes confirmed registrations to the check-in vendor on a schedule — see
// docs/onevie-checkin-sync.md for the full integration spec and
// onevie.service.ts for the per-person payload/mapping this calls.
//
// "Needs (re)sync" is decided purely by comparing timestamps, not by reading
// onevieSync.status: a registration qualifies whenever it has never
// successfully synced (onevieSync.syncedAt unset) OR has been edited since
// its last successful sync (updatedAt > onevieSync.syncedAt). This covers
// brand-new confirmations AND later edits (a name fix, a ticketCategory
// change) with zero changes needed anywhere a Registration gets confirmed or
// updated — registration.controller.ts has 8+ separate places that can set
// qrToken/confirm a registration, and hooking all of them individually would
// be exactly the kind of fragile, easy-to-miss wiring this avoids. A
// persistently-failing record (bad email already used on Onevie's side, say)
// simply gets retried every tick until someone fixes the underlying data —
// cheap enough (one HTTP call) not to need its own backoff/retry-cap logic.
let running = false;

const needsSyncFilter = {
  status: 'confirmed',
  qrToken: { $exists: true, $ne: null },
  $expr: {
    $or: [{ $eq: [{ $ifNull: ['$onevieSync.syncedAt', null] }, null] }, { $gt: ['$updatedAt', '$onevieSync.syncedAt'] }],
  },
};

const syncOne = async (registration: HydratedDocument<RegistrationDoc>): Promise<void> => {
  const attemptedAt = new Date();
  try {
    await syncRegistrationToOnevie(registration);
    registration.onevieSync = {
      status: 'synced',
      ticketTypeId: mapOnevieTicketTypeId(registration),
      syncedAt: attemptedAt,
      lastAttemptAt: attemptedAt,
      lastError: undefined,
    };
    registration.markModified('onevieSync');
    await registration.save();
  } catch (err) {
    const message = err instanceof OnevieApiError ? `[${err.status}] ${err.message}` : (err as Error).message;
    registration.onevieSync = {
      ...registration.onevieSync,
      status: 'failed',
      lastAttemptAt: attemptedAt,
      lastError: message.slice(0, 500),
    };
    registration.markModified('onevieSync');
    await registration.save();
    throw err;
  }
};

export const runOnevieSync = async (): Promise<{ skipped: boolean; synced: number; failed: number; durationMs: number }> => {
  if (running) {
    logger.warn('onevieSync: previous run still in progress, skipping this tick');
    return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
  }
  running = true;
  const startedAt = Date.now();

  try {
    const settings = await getOrCreateOnevieSettings();
    if (!settings.isEnabled) {
      logger.debug('onevieSync: disabled in admin settings, skipping');
      return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
    }
    if (!onevieConfigured) {
      logger.warn('onevieSync: enabled but ONEVIE_API_KEY is unset — nothing to do');
      return { skipped: true, synced: 0, failed: 0, durationMs: 0 };
    }

    const candidates = await Registration.find(needsSyncFilter);
    // Batch size 3 — same conservative concurrency as every other job that
    // fans out to a third-party API (abstractTriage, email sends), well
    // under Onevie's unspecified-but-real rate limit (429s are expected to
    // happen under abuse, not under light, batched traffic).
    const { succeeded, failed } = await runInBatches(candidates, 3, syncOne);

    const durationMs = Date.now() - startedAt;
    settings.set({ lastRunAt: new Date(), lastRunSynced: succeeded, lastRunFailed: failed.length, lastRunDurationMs: durationMs });
    await settings.save();

    if (failed.length > 0) {
      logger.warn({ failedCount: failed.length }, 'onevieSync: some registrations failed to sync this run');
    }

    return { skipped: false, synced: succeeded, failed: failed.length, durationMs };
  } finally {
    running = false;
  }
};

export const scheduleOnevieSync = (): void => {
  // Every 5 minutes — a check-in desk needs new confirmations to show up
  // promptly, and each run only touches registrations that are actually new
  // or changed (see needsSyncFilter above), so a short interval costs
  // nothing extra when nothing's changed since the last tick.
  cron.schedule('*/5 * * * *', () => {
    runOnevieSync().catch((err) => logger.error({ err }, 'Onevie sync job failed'));
  });
  logger.info('Onevie check-in sync job scheduled (every 5 minutes, admin-togglable)');
};

export const runOnevieSyncNow = runOnevieSync;
