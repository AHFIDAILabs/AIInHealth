import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { REPORTS_MANIFEST } from '../data/reportsManifest.js';
import { ReportAccess } from '../models/ReportAccess.model.js';
import { ReportDownloadEvent } from '../models/ReportDownloadEvent.model.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model.js';
import { setReportCookie, clearReportCookie } from '../utils/cookies.js';
import { ensureReportAccessCode, verifyReportAccessCode, signReportSessionToken } from '../services/reportAccess.service.js';
import { sendReportAccessCodeEmail } from '../services/email.service.js';
import type { RequestReportAccessCodeInput, VerifyReportAccessCodeInput, DownloadReportInput } from '../validations/reports.validation.js';

// GET /reports — public. Metadata only (id/session grouping/doc type/partners/
// page count) — deliberately the SAME shape REPORTS_MANIFEST has minus `file`,
// so the frontend never needs a second type for this; see that module's own
// comment on why `file` can never leave this endpoint.
export const list = catchAsync(async (_req: Request, res: Response) => {
  res.json(new ApiResponse(REPORTS_MANIFEST.map(({ file: _file, ...entry }) => entry)));
});

// POST /reports/request-code — public. Always succeeds (not enumeration-safe
// like reviewer.controller.ts's requestAccessCode — there's no pre-provisioned
// roster here, anyone can self-serve a code for any email they can read mail
// at, that's the whole point of the gate). Also merges into the Newsletter
// list under its own source (the user's explicit choice — see
// docs/REPORTS-LIBRARY-BRIEF.md) — duplicate-key on resubmission is a no-op,
// same shape as newsletter.controller.ts's own subscribe().
export const requestAccessCode = catchAsync(async (req: Request, res: Response) => {
  const { email, firstName } = req.body as RequestReportAccessCodeInput;

  const access = await ReportAccess.findOneAndUpdate({ email }, { $set: { firstName } }, { upsert: true, new: true });
  const accessCode = await ensureReportAccessCode(access);
  await sendReportAccessCodeEmail(email, firstName, { accessCode });

  try {
    await NewsletterSubscriber.create({ email, firstName, source: 'report_library' });
  } catch (err) {
    const isDuplicate = err instanceof Error && 'code' in err && (err as { code?: number }).code === 11000;
    if (!isDuplicate) throw err;
  }

  res.json(new ApiResponse({ message: 'Check your email for your access code.' }));
});

export const verifyAccessCode = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body as VerifyReportAccessCodeInput;
  const reportAccessId = await verifyReportAccessCode(email, code);

  const sessionToken = signReportSessionToken(reportAccessId);
  setReportCookie(res, sessionToken, env.REPORT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  res.json(new ApiResponse({ ok: true }));
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearReportCookie(res);
  res.json(new ApiResponse({ ok: true }));
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const access = await ReportAccess.findById(req.reportAccess!.reportAccessId);
  if (!access) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.json(new ApiResponse({ email: access.email, firstName: access.firstName }));
});

// POST /reports/download — the ONLY path that ever resolves a real file URL.
// 404s on an unknown reportId rather than guessing; the manifest is the
// single source of truth for which ids exist (see backend/src/data/reportsManifest.ts).
export const download = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.body as DownloadReportInput;
  const entry = REPORTS_MANIFEST.find((r) => r.id === reportId);
  if (!entry) throw new ApiError(404, 'Report not found', 'NOT_FOUND');

  const access = await ReportAccess.findById(req.reportAccess!.reportAccessId).select('email');
  if (!access) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');

  await ReportDownloadEvent.create({ email: access.email, reportId: entry.id });

  res.json(new ApiResponse({ url: `${env.REPORTS_ASSETS_BASE_URL}/${entry.file}` }));
});

// GET /admin/reports/download-stats — per-report download counts, for the
// admin side's own visibility into "which reports actually get pulled."
export const adminDownloadStats = catchAsync(async (_req: Request, res: Response) => {
  const counts = await ReportDownloadEvent.aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$reportId', count: { $sum: 1 } } },
  ]);
  const byReportId = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const totalAccessCodesIssued = await ReportAccess.countDocuments({ accessCode: { $exists: true } });
  res.json(
    new ApiResponse({
      totalDownloads: counts.reduce((sum, c) => sum + c.count, 0),
      totalAccessCodesIssued,
      byReportId,
    })
  );
});
