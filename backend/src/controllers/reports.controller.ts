import { Readable } from 'node:stream';
import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toCsv } from '../utils/toCsv.js';
import { env } from '../config/env.js';
import { REPORTS_MANIFEST } from '../data/reportsManifest.js';
import { ReportAccess } from '../models/ReportAccess.model.js';
import { ReportAccessEvent, type ReportAccessEventDoc } from '../models/ReportAccessEvent.model.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model.js';
import { setReportCookie, clearReportCookie } from '../utils/cookies.js';
import { ensureReportAccessCode, verifyReportAccessCode, signReportSessionToken } from '../services/reportAccess.service.js';
import { sendReportAccessCodeEmail } from '../services/email.service.js';
import { listReportAccessEventsQuerySchema } from '../validations/reports.validation.js';
import type {
  RequestReportAccessCodeInput,
  VerifyReportAccessCodeInput,
  ViewReportInput,
  ListReportAccessEventsQuery,
} from '../validations/reports.validation.js';

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

const findEntryOrThrow = (reportId: string) => {
  const entry = REPORTS_MANIFEST.find((r) => r.id === reportId);
  if (!entry) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  return entry;
};

const requireAccessEmail = async (req: Request): Promise<string> => {
  const access = await ReportAccess.findById(req.reportAccess!.reportAccessId).select('email');
  if (!access) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  return access.email;
};

// POST /reports/view — the "open in a new tab to read" action. Resolves the
// real Render asset URL directly (same cost as a redirect — no bytes pass
// through this server) so the browser's own PDF viewer shows it inline. This
// is the ONLY path (besides downloadFile below) that ever learns a real file
// URL — see backend/src/data/reportsManifest.ts's own comment on why that
// matters.
export const view = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.body as ViewReportInput;
  const entry = findEntryOrThrow(reportId);
  const email = await requireAccessEmail(req);

  await ReportAccessEvent.create({ email, reportId: entry.id, action: 'view' });

  res.json(new ApiResponse({ url: `${env.REPORTS_ASSETS_BASE_URL}/${entry.file}` }));
});

// GET /reports/:reportId/file — the "force an actual save-to-disk" action.
// Unlike view() above, this one DOES proxy the bytes: the Render static host
// has no server-side config of its own to set Content-Disposition, so the
// only way to guarantee a real download (rather than "whatever the visitor's
// browser/PDF-viewer settings happen to do") is to fetch the file here and
// set the header ourselves on the way back out. A plain <a href> to this URL
// works with no special JS — it's a normal GET, the report_token cookie
// travels with it like any other cross-subdomain navigation, and the
// Content-Disposition header is what makes the browser download rather than
// navigate, not the request having been a "fetch".
export const downloadFile = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params as { reportId: string };
  const entry = findEntryOrThrow(reportId);
  const email = await requireAccessEmail(req);

  const sourceUrl = `${env.REPORTS_ASSETS_BASE_URL}/${entry.file}`;
  const upstream = await fetch(sourceUrl);
  if (!upstream.ok || !upstream.body) {
    throw new ApiError(502, 'The report file is temporarily unavailable. Please try again shortly.', 'UPSTREAM_UNAVAILABLE');
  }

  await ReportAccessEvent.create({ email, reportId: entry.id, action: 'download' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${entry.id}.pdf"`);
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  // Node's global fetch() types upstream.body as the DOM lib's ReadableStream,
  // while Readable.fromWeb expects node:stream/web's — same runtime shape,
  // different type-only identity, so this cast is just bridging the two
  // declaration sources, not actually unsafe.
  Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
});

// GET /admin/reports/access-stats — per-report view/download counts, for the
// admin side's own visibility into "which reports actually get read/pulled."
export const adminAccessStats = catchAsync(async (_req: Request, res: Response) => {
  const counts = await ReportAccessEvent.aggregate<{ _id: { reportId: string; action: string }; count: number }>([
    { $group: { _id: { reportId: '$reportId', action: '$action' }, count: { $sum: 1 } } },
  ]);

  const byReportId: Record<string, { views: number; downloads: number }> = {};
  let totalViews = 0;
  let totalDownloads = 0;
  for (const c of counts) {
    const row = (byReportId[c._id.reportId] ??= { views: 0, downloads: 0 });
    if (c._id.action === 'view') {
      row.views += c.count;
      totalViews += c.count;
    } else {
      row.downloads += c.count;
      totalDownloads += c.count;
    }
  }

  const totalAccessCodesIssued = await ReportAccess.countDocuments({ accessCode: { $exists: true } });
  res.json(new ApiResponse({ totalViews, totalDownloads, totalAccessCodesIssued, byReportId }));
});

const buildEventFilter = (query: ListReportAccessEventsQuery): FilterQuery<ReportAccessEventDoc> => {
  const filter: FilterQuery<ReportAccessEventDoc> = {};
  if (query.action) filter.action = query.action;
  if (query.reportId) filter.reportId = query.reportId;
  if (query.q) filter.email = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return filter;
};

// Attaches each event's reportId to its sessionTitle/docTypeLabel so the
// admin table reads like "Session Report — Welcome Remarks..." rather than a
// bare id — looked up from the same in-memory manifest everything else here
// already reads from, no extra query.
const withReportLabel = (e: { reportId: string; [k: string]: unknown }) => {
  const entry = REPORTS_MANIFEST.find((r) => r.id === e.reportId);
  return { ...e, sessionTitle: entry?.sessionTitle ?? null, docTypeLabel: entry?.docTypeLabel ?? null };
};

// GET /admin/reports/events — who viewed/downloaded which report, and when.
// This is the actual per-visitor log the admin dashboard's "who downloaded
// our reports" view needs — access-stats above only has aggregate counts.
export const adminListAccessEvents = catchAsync(async (req: Request, res: Response) => {
  const query = listReportAccessEventsQuerySchema.parse(req.query);
  const filter = buildEventFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ReportAccessEvent.find(filter).sort({ accessedAt: -1 }).skip(skip).limit(query.limit).lean(),
    ReportAccessEvent.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items.map(withReportLabel), { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const EVENT_CSV_COLUMNS = ['email', 'reportId', 'sessionTitle', 'docTypeLabel', 'action', 'accessedAt'];

export const adminExportAccessEvents = catchAsync(async (req: Request, res: Response) => {
  const query = listReportAccessEventsQuerySchema.parse(req.query);
  const filter = buildEventFilter(query);
  const items = await ReportAccessEvent.find(filter).sort({ accessedAt: -1 }).lean();

  const csv = toCsv(items.map(withReportLabel) as unknown as Record<string, unknown>[], EVENT_CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reports-library-events-${Date.now()}.csv"`);
  res.send(csv);
});
