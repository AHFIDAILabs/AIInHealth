import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { toCsv } from '../utils/toCsv.js';
import { NewsletterSubscriber, type NewsletterSubscriberDoc } from '../models/NewsletterSubscriber.model.js';
import type { SubscribeNewsletterInput, ListNewsletterSubscribersQuery } from '../validations/newsletter.validation.js';
import { listNewsletterSubscribersQuerySchema } from '../validations/newsletter.validation.js';
import { emitAdminNotification } from '../services/notification.service.js';

const SOURCE_LABEL: Record<SubscribeNewsletterInput['source'], string> = {
  updates: 'summit updates',
  concept_note: 'the Concept Note download',
};

// POST /newsletter/subscribe — public. Same (email, source) submitted twice is a
// no-op, not an error — the visitor doesn't need to know or care they'd already
// signed up. The unique (email, source) index is what actually enforces that; a
// duplicate-key error here just means someone else's request beat this one to it.
export const subscribe = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as SubscribeNewsletterInput & { website?: string };

  try {
    const subscriber = await NewsletterSubscriber.create(input);
    await emitAdminNotification({
      type: 'newsletter.new',
      title: `New signup — ${SOURCE_LABEL[input.source]}`,
      body: `${input.firstName} <${input.email}>`,
      resourceType: 'NewsletterSubscriber',
      resourceId: subscriber.id,
    });
  } catch (err) {
    const isDuplicate = err instanceof Error && 'code' in err && (err as { code?: number }).code === 11000;
    if (!isDuplicate) throw err;
  }

  res.status(201).json(new ApiResponse({ message: "You're on the list." }));
});

const buildFilter = (query: ListNewsletterSubscribersQuery): FilterQuery<NewsletterSubscriberDoc> => {
  const filter: FilterQuery<NewsletterSubscriberDoc> = {};
  if (query.source) filter.source = query.source;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ email: rx }, { firstName: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listNewsletterSubscribersQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    NewsletterSubscriber.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const CSV_COLUMNS = ['_id', 'email', 'firstName', 'source', 'createdAt'];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = listNewsletterSubscribersQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const items = await NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).lean();

  const csv = toCsv(items as unknown as Record<string, unknown>[], CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`);
  res.send(csv);
});
