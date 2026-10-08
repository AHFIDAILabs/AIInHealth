import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getOrCreateInnovatorSettings } from '../models/InnovatorSettings.model.js';
import { recordAudit } from '../services/audit.service.js';
import type { SetInnovatorSettingsInput } from '../validations/innovatorSettings.validation.js';

// GET /innovators/applications-status — public. Read by the Register page's
// Innovator tab before it lets someone submit a fresh application (an
// already-issued access code can still be redeemed either way — see
// registration.controller.ts's create()).
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateInnovatorSettings();
  res.json(new ApiResponse({ open: settings.applicationsOpen, reason: settings.closedReason }));
});

export const adminGet = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateInnovatorSettings();
  res.json(
    new ApiResponse({
      open: settings.applicationsOpen,
      reason: settings.closedReason,
      closedAt: settings.closedAt,
    })
  );
});

export const adminSet = catchAsync(async (req: Request, res: Response) => {
  const { applicationsOpen, reason } = req.body as SetInnovatorSettingsInput;
  const settings = await getOrCreateInnovatorSettings();
  settings.applicationsOpen = applicationsOpen;
  settings.closedReason = applicationsOpen ? undefined : reason;
  settings.closedAt = applicationsOpen ? undefined : new Date();
  settings.closedBy = applicationsOpen ? undefined : (req.user!.sub as never);
  await settings.save();

  await recordAudit({
    req,
    action: applicationsOpen ? 'innovatorSettings.applications_opened' : 'innovatorSettings.applications_closed',
    resourceType: 'InnovatorSettings',
    resourceId: settings.id,
    after: { applicationsOpen, reason },
  });

  res.json(new ApiResponse({ open: settings.applicationsOpen, reason: settings.closedReason }));
});
