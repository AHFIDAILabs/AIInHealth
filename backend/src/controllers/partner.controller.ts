import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Partner, type PartnerDoc } from '../models/Partner.model.js';
import { Deliverable } from '../models/Deliverable.model.js';
import { PartnerInteraction } from '../models/PartnerInteraction.model.js';
import {
  createPartnerSchema,
  updatePartnerSchema,
  listPartnersQuerySchema,
  type ListPartnersQuery,
} from '../validations/partner.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { PARTNER_STATUSES } from '../types/enums.js';

// GET /partners — public, published only. Package populated (name + tierOrder)
// so the public Partners page can group logos into Title/Technical/Supporting
// sections purely from that field — see PartnersShowcase.tsx.
export const list = catchAsync(async (_req: Request, res: Response) => {
  const filter: FilterQuery<PartnerDoc> = { isPublished: true };
  const partners = await Partner.find(filter).populate('package', 'name tierOrder').sort({ order: 1, name: 1 });
  res.json(new ApiResponse(partners));
});

const buildAdminFilter = (query: ListPartnersQuery): FilterQuery<PartnerDoc> => {
  const filter: FilterQuery<PartnerDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { contactName: rx }, { contactEmail: rx }];
  }
  return filter;
};

// Shared by adminList and analytics — grouped deliverable counts per
// partner, one query rather than an N+1 lookup per row (same pattern as
// abstractController.reviewSummaryByAbstract).
const deliverableSummaryByPartner = async (partnerIds: string[]) => {
  const deliverables = await Deliverable.find({ partner: { $in: partnerIds } });
  const byPartner = new Map<string, typeof deliverables>();
  for (const d of deliverables) {
    const key = d.partner.toString();
    if (!byPartner.has(key)) byPartner.set(key, []);
    byPartner.get(key)!.push(d);
  }
  return byPartner;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listPartnersQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Partner.find(filter).populate('package', 'name price tierOrder').sort({ order: 1, name: 1 }).skip(skip).limit(query.limit),
    Partner.countDocuments(filter),
  ]);

  const summaries = await deliverableSummaryByPartner(items.map((i) => i.id));
  const withDeliverables = items.map((item) => {
    const deliverables = summaries.get(item.id) ?? [];
    const completed = deliverables.filter((d) => d.status === 'completed').length;
    return { ...item.toObject(), deliverablesCompleted: completed, deliverablesTotal: deliverables.length };
  });

  res.json(
    new ApiResponse(withDeliverables, {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit) || 1,
    })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createPartnerSchema.parse({ body: req.body }).body;
  const partner = await Partner.create(input);
  await recordAudit({ req, action: 'partner.created', resourceType: 'Partner', resourceId: partner.id, after: partner.toObject() });
  res.status(201).json(new ApiResponse(partner));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const input = updatePartnerSchema.parse({ body: req.body }).body;
  const before = await Partner.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findByIdAndUpdate(req.params.id, input, { new: true }).populate('package', 'name price tierOrder');
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'partner.updated',
    resourceType: 'Partner',
    resourceId: partner.id,
    before: before.toObject(),
    after: partner.toObject(),
  });
  res.json(new ApiResponse(partner));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findByIdAndDelete(req.params.id);
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'partner.deleted', resourceType: 'Partner', resourceId: req.params.id, before: partner.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});

// GET /admin/partners-analytics — backs the Sponsors stat cards, Outreach
// tab, and Deliverables Overview tab.
export const analytics = catchAsync(async (_req: Request, res: Response) => {
  const [partners, deliverables, interactions] = await Promise.all([
    Partner.find().select('status amountPaidKobo').lean(),
    Deliverable.find().populate('partner', 'name').sort({ createdAt: -1 }).lean(),
    PartnerInteraction.find().lean(),
  ]);

  const conversionFunnel = Object.fromEntries(PARTNER_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  let totalRevenueKobo = 0;
  for (const p of partners) {
    conversionFunnel[p.status] = (conversionFunnel[p.status] ?? 0) + 1;
    totalRevenueKobo += p.amountPaidKobo ?? 0;
  }

  const now = new Date();
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  for (const d of deliverables) {
    if (d.status === 'completed') completed += 1;
    else if (d.dueDate < now) overdue += 1;
    else pending += 1;
  }

  const pendingFollowUps = interactions.filter((i) => i.followUpDueAt && !i.followUpCompleted).length;

  res.json(
    new ApiResponse({
      totalSponsors: partners.length,
      activeSponsors: conversionFunnel.active ?? 0,
      totalRevenueNaira: Math.round(totalRevenueKobo / 100),
      pendingDeliverables: pending,
      totalInteractions: interactions.length,
      pendingFollowUps,
      conversionFunnel,
      deliverableProgress: { completed, pending, overdue },
      recentDeliverables: deliverables.slice(0, 5),
    })
  );
});

// GET /admin/sponsorship-packages/:id/... helper reused by
// sponsorshipPackage.controller.ts's adminDelete, to block deleting a
// package still assigned to partners rather than silently orphaning them.
export const countPartnersUsingPackage = (packageId: string): Promise<number> => Partner.countDocuments({ package: packageId });
