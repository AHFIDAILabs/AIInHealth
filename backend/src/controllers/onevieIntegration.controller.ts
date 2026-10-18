import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { WaiHealthRegistration } from '../models/WaiHealthRegistration.model.js';
import { getOrCreateOnevieSettings } from '../models/OnevieSettings.model.js';
import { getOrCreateOnevieWaiSettings } from '../models/OnevieWaiSettings.model.js';
import { onevieConfigured } from '../services/onevie.service.js';
import { onevieWaiConfigured } from '../services/onevieWai.service.js';
import { runOnevieSyncNow } from '../jobs/onevieSync.job.js';
import { runOnevieWaiSyncNow } from '../jobs/onevieWaiSync.job.js';
import { recordAudit } from '../services/audit.service.js';
import type { ToggleOnevieInput, ToggleOnevieWaiInput } from '../validations/onevieIntegration.validation.js';

// GET /admin/integrations/onevie/status — the Integrations page's Onevie
// card. Counts are computed live (cheap at Summit scale, hundreds not
// millions of registrations) rather than cached, so the dashboard is never
// stale between job runs. recentFailures is capped — this is a glance at
// what's wrong, not a full export; an admin chasing a specific person still
// goes to the Registrations page.
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateOnevieSettings();

  const [pendingCount, syncedCount, failedCount, skippedCount, recentFailures] = await Promise.all([
    Registration.countDocuments({ status: 'confirmed', qrToken: { $exists: true, $ne: null }, onevieSync: { $exists: false } }),
    Registration.countDocuments({ 'onevieSync.status': 'synced' }),
    Registration.countDocuments({ 'onevieSync.status': 'failed' }),
    Registration.countDocuments({ 'onevieSync.status': 'skipped' }),
    Registration.find({ 'onevieSync.status': { $in: ['failed', 'skipped'] } })
      .sort({ 'onevieSync.lastAttemptAt': -1 })
      .limit(20)
      .select('fullName contactName email contactEmail type onevieSync.status onevieSync.lastError onevieSync.lastAttemptAt'),
  ]);

  res.json(
    new ApiResponse({
      configured: onevieConfigured,
      isEnabled: settings.isEnabled,
      lastRunAt: settings.lastRunAt ?? null,
      lastRunSynced: settings.lastRunSynced ?? null,
      lastRunFailed: settings.lastRunFailed ?? null,
      lastRunDurationMs: settings.lastRunDurationMs ?? null,
      pendingCount,
      syncedCount,
      failedCount,
      skippedCount,
      recentIssues: recentFailures.map((r) => ({
        id: r.id,
        name: r.fullName || r.contactName || '(no name)',
        email: r.email || r.contactEmail || null,
        type: r.type,
        status: r.onevieSync?.status ?? 'failed',
        error: r.onevieSync?.lastError ?? null,
        lastAttemptAt: r.onevieSync?.lastAttemptAt ?? null,
      })),
    })
  );
});

// PATCH /admin/integrations/onevie/toggle — the admin kill switch. Flipping
// this off takes effect on the NEXT job tick (within 5 minutes), not
// instantly — the job itself checks isEnabled at the top of every run.
export const toggle = catchAsync(async (req: Request, res: Response) => {
  const { isEnabled } = req.body as ToggleOnevieInput;
  const settings = await getOrCreateOnevieSettings();
  const before = { isEnabled: settings.isEnabled };
  settings.isEnabled = isEnabled;
  await settings.save();

  await recordAudit({
    req,
    action: 'onevieSettings.toggled',
    resourceType: 'OnevieSettings',
    resourceId: settings.id,
    before,
    after: { isEnabled: settings.isEnabled },
  });

  res.json(new ApiResponse({ isEnabled: settings.isEnabled }));
});

// POST /admin/integrations/onevie/sync-now — runs the same job the cron
// schedule fires, on demand. Respects the same isEnabled/configured guards
// (won't silently bypass the kill switch just because it was triggered
// manually).
export const syncNow = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateOnevieSettings();
  if (!settings.isEnabled) throw new ApiError(400, 'Onevie sync is turned off — enable it first.', 'DISABLED');
  if (!onevieConfigured) throw new ApiError(400, 'Onevie is not configured on the server (ONEVIE_API_KEY unset).', 'NOT_CONFIGURED');

  const result = await runOnevieSyncNow();
  res.json(new ApiResponse(result));
});

// --- WAI-Health Breakfast's separate Onevie event ("AIHS-women delegate
// sync") — same three endpoints, mirrored, against WaiHealthRegistration
// instead of Registration. ---

export const waiStatus = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateOnevieWaiSettings();

  const [eligibleCount, pendingCount, syncedCount, failedCount] = await Promise.all([
    WaiHealthRegistration.countDocuments({ rsvpConfirmedAt: { $exists: true }, declined: { $ne: true } }),
    WaiHealthRegistration.countDocuments({
      rsvpConfirmedAt: { $exists: true },
      declined: { $ne: true },
      checkinQrToken: { $exists: true, $ne: null },
      onevieWaiSync: { $exists: false },
    }),
    WaiHealthRegistration.countDocuments({ 'onevieWaiSync.status': 'synced' }),
    WaiHealthRegistration.countDocuments({ 'onevieWaiSync.status': 'failed' }),
  ]);

  res.json(
    new ApiResponse({
      configured: onevieWaiConfigured,
      isEnabled: settings.isEnabled,
      lastRunAt: settings.lastRunAt ?? null,
      lastRunSynced: settings.lastRunSynced ?? null,
      lastRunFailed: settings.lastRunFailed ?? null,
      lastRunDurationMs: settings.lastRunDurationMs ?? null,
      eligibleCount,
      pendingCount,
      syncedCount,
      failedCount,
    })
  );
});

export const waiToggle = catchAsync(async (req: Request, res: Response) => {
  const { isEnabled } = req.body as ToggleOnevieWaiInput;
  const settings = await getOrCreateOnevieWaiSettings();
  const before = { isEnabled: settings.isEnabled };
  settings.isEnabled = isEnabled;
  await settings.save();

  await recordAudit({
    req,
    action: 'onevieWaiSettings.toggled',
    resourceType: 'OnevieWaiSettings',
    resourceId: settings.id,
    before,
    after: { isEnabled: settings.isEnabled },
  });

  res.json(new ApiResponse({ isEnabled: settings.isEnabled }));
});

export const waiSyncNow = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateOnevieWaiSettings();
  if (!settings.isEnabled) throw new ApiError(400, 'Onevie WAI sync is turned off — enable it first.', 'DISABLED');
  if (!onevieWaiConfigured) throw new ApiError(400, 'Onevie WAI is not configured on the server (ONEVIE_WAI_API_KEY unset).', 'NOT_CONFIGURED');

  const result = await runOnevieWaiSyncNow();
  res.json(new ApiResponse(result));
});
