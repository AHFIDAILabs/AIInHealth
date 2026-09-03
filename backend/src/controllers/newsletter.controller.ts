import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model.js';
import type { SubscribeNewsletterInput } from '../validations/newsletter.validation.js';
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
