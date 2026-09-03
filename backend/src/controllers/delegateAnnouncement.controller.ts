import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendPushToAllDelegates } from '../services/delegatePush.service.js';
import { recordAudit } from '../services/audit.service.js';
import type { SendAnnouncementInput } from '../validations/delegateAnnouncement.validation.js';

// Event-day broadcast (venue changes, "session starting in 10 minutes") pushed to
// every subscribed delegate device — no persistence, this is fire-and-forget like
// the rest of the web-push layer.
export const send = catchAsync(async (req: Request, res: Response) => {
  const { title, body, url } = req.body as SendAnnouncementInput;
  const recipientCount = await sendPushToAllDelegates({ title, body, url });

  await recordAudit({
    req,
    action: 'delegate_announcement.sent',
    resourceType: 'DelegateAnnouncement',
    resourceId: 'broadcast',
    after: { title, body, recipientCount },
  });

  res.status(201).json(new ApiResponse({ recipientCount }));
});
