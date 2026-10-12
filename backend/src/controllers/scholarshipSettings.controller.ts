import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getOrCreateScholarshipSettings } from '../models/ScholarshipSettings.model.js';
import { recordAudit } from '../services/audit.service.js';
import type { SetScholarshipSettingsInput } from '../validations/scholarshipSettings.validation.js';

// GET /scholarship-applications/applications-status — public. Read by the
// Sponsored Delegate application page before it lets someone submit a fresh
// application. An already-approved applicant's issued access code still works
// either way — this only gates brand-new submissions (see submit() in
// scholarshipApplication.controller.ts).
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateScholarshipSettings();
  res.json(new ApiResponse({ open: settings.applicationsOpen, reason: settings.closedReason }));
});

export const adminGet = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateScholarshipSettings();
  res.json(
    new ApiResponse({
      open: settings.applicationsOpen,
      reason: settings.closedReason,
      closedAt: settings.closedAt,
    })
  );
});

export const adminSet = catchAsync(async (req: Request, res: Response) => {
  const { applicationsOpen, reason } = req.body as SetScholarshipSettingsInput;
  const settings = await getOrCreateScholarshipSettings();
  settings.applicationsOpen = applicationsOpen;
  settings.closedReason = applicationsOpen ? undefined : reason;
  settings.closedAt = applicationsOpen ? undefined : new Date();
  settings.closedBy = applicationsOpen ? undefined : (req.user!.sub as never);
  await settings.save();

  await recordAudit({
    req,
    action: applicationsOpen ? 'scholarshipSettings.applications_opened' : 'scholarshipSettings.applications_closed',
    resourceType: 'ScholarshipSettings',
    resourceId: settings.id,
    after: { applicationsOpen, reason },
  });

  res.json(new ApiResponse({ open: settings.applicationsOpen, reason: settings.closedReason }));
});
