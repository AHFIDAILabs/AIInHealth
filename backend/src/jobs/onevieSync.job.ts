import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { getOrCreateOnevieSettings } from '../models/OnevieSettings.model.js';
import { onevieConfigured, syncRegistrationToOnevie, mapOnevieTicketTypeId, getOnevieEmail, OnevieApiError } from '../services/onevie.service.js';
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface SyncOneResult {
  ok: boolean;
  // Onevie's own doc says 429 means "wait and retry" — surfaced separately
  // from `ok` so the caller can back off before the next chunk rather than
  // hammering straight back in and producing more of the same.
  rateLimited: boolean;
}

const syncOne = async (registration: HydratedDocument<RegistrationDoc>): Promise<SyncOneResult> => {
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
    return { ok: true, rateLimited: false };
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
    return { ok: false, rateLimited: err instanceof OnevieApiError && err.status === 429 };
  }
};

// Onevie rejects a second registration under an email already in use — "one
// email = one ticket" on their side, with no documented way for us to
// delete/replace an entry once accepted. Two of our registration types can
// legitimately share a person's email (e.g. someone registers as an
// attendee, then separately as an innovator) — confirmed live when 3 such
// pairs all hit real "email already registered" 400s. The fix has two parts:
// a non-'attendee' registration is preferred when a conflict is still open
// (decided with the team — the more specific role is more likely the one
// they'll actually use at check-in), and a conflict already resolved in
// Onevie's favor of the "wrong" sibling can only be undone by deleting that
// entry on Onevie's own side — there is nothing left for this code to retry.
const isPreferred = (a: HydratedDocument<RegistrationDoc>, b: HydratedDocument<RegistrationDoc>): boolean => {
  if (a.type === 'attendee' && b.type !== 'attendee') return false;
  if (a.type !== 'attendee' && b.type === 'attendee') return true;
  return a.id < b.id; // deterministic tie-break between two same-preference siblings
};

const markSkipped = async (registration: HydratedDocument<RegistrationDoc>, reason: string): Promise<void> => {
  if (registration.onevieSync?.status === 'skipped' && registration.onevieSync.lastError === reason) return; // already recorded, no-op write
  registration.onevieSync = { ...registration.onevieSync, status: 'skipped', lastAttemptAt: new Date(), lastError: reason };
  registration.markModified('onevieSync');
  await registration.save();
};

// Splits this run's candidates into who actually gets an API call vs who's
// skipped for an email conflict — recomputed fresh every tick from current
// DB state (not cached), so a skip is never permanent in itself: if the
// winning sibling later fails for an unrelated reason, the loser is
// reconsidered on the very next tick.
const resolveEmailConflicts = async (
  candidates: HydratedDocument<RegistrationDoc>[]
): Promise<HydratedDocument<RegistrationDoc>[]> => {
  if (candidates.length === 0) return candidates;

  const allConfirmed = await Registration.find({ status: 'confirmed', qrToken: { $exists: true, $ne: null } }).select(
    'type email contactEmail onevieSync.status'
  );

  const byEmail = new Map<string, HydratedDocument<RegistrationDoc>[]>();
  for (const reg of allConfirmed) {
    const email = getOnevieEmail(reg);
    if (!email) continue;
    const group = byEmail.get(email) ?? [];
    group.push(reg);
    byEmail.set(email, group);
  }

  const toSync: HydratedDocument<RegistrationDoc>[] = [];
  for (const candidate of candidates) {
    const email = getOnevieEmail(candidate);
    const group = email ? (byEmail.get(email) ?? []) : [];
    const siblings = group.filter((r) => r.id !== candidate.id);

    const alreadySyncedSibling = siblings.find((s) => s.onevieSync?.status === 'synced');
    if (alreadySyncedSibling) {
      // eslint-disable-next-line no-await-in-loop
      await markSkipped(
        candidate,
        `Skipped — email already registered to a ${alreadySyncedSibling.type} registration (${alreadySyncedSibling.id}) in Onevie`
      );
      continue;
    }

    const unsyncedSiblingsInThisRun = siblings.filter((s) => candidates.some((c) => c.id === s.id));
    const isOutranked = unsyncedSiblingsInThisRun.some((s) => isPreferred(s, candidate));
    if (isOutranked) {
      // eslint-disable-next-line no-await-in-loop
      await markSkipped(candidate, 'Skipped this run — a preferred sibling registration shares this email and goes first');
      continue;
    }

    toSync.push(candidate);
  }

  return toSync;
};

// Fully serial with a pause between each call — NOT runInBatches (every
// other job using that fires chunk after chunk back to back). The first two
// syncs after this feature shipped (560 historical registrations in one run)
// hit 429 on most of them — first at 3-concurrent-no-delay, then still ~70
// at 2-concurrent/500ms. Onevie's real limit is evidently tighter than
// either, so this runs one at a time. Delay decays gradually rather than
// snapping straight back to base after one clean call, so a run settles near
// the actual limit instead of oscillating between "too fast" and "too slow".
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

const syncAll = async (
  candidates: HydratedDocument<RegistrationDoc>[]
): Promise<{ succeeded: number; failed: number }> => {
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
    const toSync = await resolveEmailConflicts(candidates);
    const { succeeded, failed } = await syncAll(toSync);

    const durationMs = Date.now() - startedAt;
    settings.set({ lastRunAt: new Date(), lastRunSynced: succeeded, lastRunFailed: failed, lastRunDurationMs: durationMs });
    await settings.save();

    if (failed > 0) {
      logger.warn({ failedCount: failed }, 'onevieSync: some registrations failed to sync this run');
    }

    return { skipped: false, synced: succeeded, failed, durationMs };
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
