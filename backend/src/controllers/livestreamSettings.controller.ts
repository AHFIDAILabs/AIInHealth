import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getOrCreateLivestreamSettings } from '../models/LivestreamSettings.model.js';
import { recordAudit } from '../services/audit.service.js';
import type { SetLivestreamSettingsInput } from '../validations/livestreamSettings.validation.js';

// GET /livestream/status — public. Read by both the dedicated /live page and
// the homepage's "Watch Live" section (frontend resolves which day's URL is
// "live now" itself, from the same fixed Summit dates used everywhere else
// — nothing date-dependent happens server-side here).
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateLivestreamSettings();
  res.json(new ApiResponse({ isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url }));
});

export const adminGet = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateLivestreamSettings();
  res.json(new ApiResponse({ isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url }));
});

export const adminSet = catchAsync(async (req: Request, res: Response) => {
  const { isEnabled, day1Url, day2Url } = req.body as SetLivestreamSettingsInput;
  const settings = await getOrCreateLivestreamSettings();
  const before = { isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url };

  settings.isEnabled = isEnabled;
  if (day1Url !== undefined) settings.day1Url = day1Url;
  if (day2Url !== undefined) settings.day2Url = day2Url;
  await settings.save();

  await recordAudit({
    req,
    action: 'livestreamSettings.updated',
    resourceType: 'LivestreamSettings',
    resourceId: settings.id,
    before,
    after: { isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url },
  });

  res.json(new ApiResponse({ isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url }));
});
