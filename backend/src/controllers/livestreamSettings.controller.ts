import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getOrCreateLivestreamSettings } from '../models/LivestreamSettings.model.js';
import { LivestreamViewer } from '../models/LivestreamViewer.model.js';
import { Registration } from '../models/Registration.model.js';
import { recordAudit } from '../services/audit.service.js';
import { toCsv } from '../utils/toCsv.js';
import type { SetLivestreamSettingsInput, RequestLivestreamAccessInput } from '../validations/livestreamSettings.validation.js';

// GET /livestream/status — public. Read by both the dedicated /live page and
// the homepage's "Watch Live" section (frontend resolves which day's URL is
// "live now" itself, from the same fixed Summit dates used everywhere else
// — nothing date-dependent happens server-side here).
export const status = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateLivestreamSettings();
  res.json(new ApiResponse({ isEnabled: settings.isEnabled, day1Url: settings.day1Url, day2Url: settings.day2Url }));
});

// POST /livestream/access — public. Never actually blocks anyone (we're not
// gatekeeping who gets to watch) — it just makes sure every viewer leaves a
// record: if their email already matches a real Registration, that link is
// noted; if not, they're logged here instead of being silently anonymous.
// Idempotent per email (repeat visits just bump lastAccessedAt), same
// "resubmitting is a no-op" shape as NewsletterSubscriber signups.
export const requestAccess = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body as RequestLivestreamAccessInput;

  const registration = await Registration.findOne({ $or: [{ email }, { contactEmail: email }] }).select('_id').lean();

  const viewer = await LivestreamViewer.findOneAndUpdate(
    { email },
    {
      $set: { lastAccessedAt: new Date(), ...(registration && { matchedRegistration: registration._id }) },
      $setOnInsert: { firstAccessedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  res.json(new ApiResponse({ granted: true, alreadyRegistered: Boolean(viewer.matchedRegistration) }));
});

// GET /admin/livestream-viewers/stats — total viewers + how many were already
// registered vs. logged fresh, for the Settings page's small summary block.
export const adminViewerStats = catchAsync(async (_req: Request, res: Response) => {
  const [total, matched] = await Promise.all([
    LivestreamViewer.countDocuments(),
    LivestreamViewer.countDocuments({ matchedRegistration: { $exists: true } }),
  ]);
  res.json(new ApiResponse({ total, matched, unmatched: total - matched }));
});

const EXPORT_COLUMNS = ['email', 'matchedRegistration', 'firstAccessedAt', 'lastAccessedAt'];

export const adminExportViewers = catchAsync(async (_req: Request, res: Response) => {
  const items = await LivestreamViewer.find().sort({ lastAccessedAt: -1 }).lean();
  const rows = items.map((v) => ({ ...v, matchedRegistration: v.matchedRegistration ? 'yes' : 'no' }));
  const csv = toCsv(rows, EXPORT_COLUMNS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="livestream-viewers.csv"');
  res.send(csv);
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
