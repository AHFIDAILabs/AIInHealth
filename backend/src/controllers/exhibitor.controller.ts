import type { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { Lead } from '../models/Lead.model.js';
import { LEAD_INTEREST_LEVELS, BOOTH_SIZES } from '../types/enums.js';
import { recordAudit } from '../services/audit.service.js';

// GET /admin/exhibitors-stats — the Exhibitors page's 4 stat cards.
export const adminStats = catchAsync(async (_req: Request, res: Response) => {
  const [total, active, totalLeads, hotLeads] = await Promise.all([
    Registration.countDocuments({ type: 'exhibitor' }),
    Registration.countDocuments({ type: 'exhibitor', status: 'confirmed', isActive: true }),
    Lead.countDocuments(),
    Lead.countDocuments({ interestLevel: 'hot' }),
  ]);
  res.json(new ApiResponse({ totalExhibitors: total, activeExhibitors: active, totalLeadsCaptured: totalLeads, hotLeads }));
});

// GET /admin/exhibitors-analytics — the Leads Analytics tab.
export const adminAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const [byExhibitorRaw, byInterestRaw] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$exhibitor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'registrations', localField: '_id', foreignField: '_id', as: 'exhibitor' } },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$interestLevel', count: { $sum: 1 } } }]),
  ]);

  const topExhibitorsByLeads = byExhibitorRaw.map((row) => ({
    exhibitorName: (row as unknown as { exhibitor: { companyName?: string }[] }).exhibitor[0]?.companyName ?? 'Unknown',
    leadCount: row.count,
  }));

  const leadsByInterestLevel = Object.fromEntries(LEAD_INTEREST_LEVELS.map((l) => [l, 0])) as Record<string, number>;
  byInterestRaw.forEach((r) => (leadsByInterestLevel[r._id] = r.count));

  res.json(new ApiResponse({ topExhibitorsByLeads, leadsByInterestLevel }));
});

interface ImportReport {
  totalRows: number;
  inserted: { companyName: string; contactEmail: string }[];
  skippedDuplicates: { row: number; contactEmail: string }[];
  validationFailures: { row: number; error: string }[];
}

// POST /admin/exhibitors/import — bulk-create from a CSV (Company Name,
// Contact Name, Contact Email required; Contact Phone, Website, Booth Size
// optional). Imported rows are confirmed immediately, same "staff is
// vouching" convention as registration.controller.ts's adminCreate. Every
// row this can't safely process is reported, never silently guessed —
// same pattern as scripts/syncVolunteerApplications.ts.
export const adminImport = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'Upload a .csv file.', 'NO_FILE');

  const raw = req.file.buffer.toString('utf-8');
  let records: Record<string, string>[];
  try {
    records = parse(raw, { columns: (header: string[]) => header.map((h) => h.trim()), skip_empty_lines: true, trim: true });
  } catch {
    throw new ApiError(422, 'Could not parse this file as CSV.', 'INVALID_CSV');
  }

  const findCol = (row: Record<string, string>, pattern: RegExp): string | undefined => {
    const key = Object.keys(row).find((k) => pattern.test(k));
    return key ? row[key]?.trim() : undefined;
  };

  const report: ImportReport = { totalRows: records.length, inserted: [], skippedDuplicates: [], validationFailures: [] };
  const boothSizeSet = new Set<string>(BOOTH_SIZES);

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    const rowNum = i + 2; // header is row 1
    const companyName = findCol(row, /company/i);
    const contactName = findCol(row, /contact.?name/i);
    const contactEmail = findCol(row, /contact.?email|^email$/i)?.toLowerCase();
    const contactPhone = findCol(row, /phone/i);
    const website = findCol(row, /website|url/i);
    const boothSizeRaw = findCol(row, /booth.?size/i)?.toLowerCase();

    if (!companyName || companyName.length < 2) {
      report.validationFailures.push({ row: rowNum, error: 'Missing or invalid Company Name' });
      continue;
    }
    if (!contactName || contactName.length < 2) {
      report.validationFailures.push({ row: rowNum, error: 'Missing or invalid Contact Name' });
      continue;
    }
    if (!contactEmail || !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      report.validationFailures.push({ row: rowNum, error: 'Missing or invalid Contact Email' });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const existing = await Registration.findOne({ type: 'exhibitor', contactEmail });
    if (existing) {
      report.skippedDuplicates.push({ row: rowNum, contactEmail });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await Registration.create({
      type: 'exhibitor',
      status: 'confirmed',
      companyName,
      contactName,
      contactEmail,
      contactPhone: contactPhone || undefined,
      website: website || undefined,
      boothSize: boothSizeRaw && boothSizeSet.has(boothSizeRaw) ? boothSizeRaw : undefined,
    });
    report.inserted.push({ companyName, contactEmail });
  }

  await recordAudit({
    req,
    action: 'exhibitor.imported',
    resourceType: 'Registration',
    resourceId: 'batch',
    after: { inserted: report.inserted.length, skipped: report.skippedDuplicates.length, failed: report.validationFailures.length },
  });

  res.status(201).json(new ApiResponse(report));
});
