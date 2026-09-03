import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { env, publicApiUrl } from '../config/env.js';
import { paystackConfigured } from '../services/paystack.service.js';
import { emailConfigured, sendTestEmail } from '../services/email.service.js';
import { pushConfigured, sendTestPush } from '../services/push.service.js';
import { User } from '../models/User.model.js';

// GET /admin/integrations/status — read-only health check. Never returns secret
// values, only whether each integration has credentials configured, plus the exact
// webhook URL to paste into Paystack's dashboard.
export const status = catchAsync(async (_req: Request, res: Response) => {
  res.json(
    new ApiResponse({
      paystack: { configured: paystackConfigured, webhookUrl: `${publicApiUrl.replace(/\/$/, '')}/api/v1/payments/webhook` },
      email: { configured: emailConfigured, sender: emailConfigured ? env.MS_SENDER_EMAIL : null },
      push: { configured: pushConfigured, publicKey: env.VAPID_PUBLIC_KEY || null },
    })
  );
});

export const testEmail = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub).select('email');
  if (!user) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  if (!emailConfigured) throw new ApiError(400, 'Email is not configured on the server.', 'NOT_CONFIGURED');
  await sendTestEmail(user.email);
  res.json(new ApiResponse({ sentTo: user.email }));
});

export const testPush = catchAsync(async (req: Request, res: Response) => {
  if (!pushConfigured) throw new ApiError(400, 'Push is not configured on the server.', 'NOT_CONFIGURED');
  const count = await sendTestPush(req.user!.sub);
  if (count === 0) throw new ApiError(400, 'You have no active push subscriptions on this account — enable push in Settings first.', 'NO_SUBSCRIPTIONS');
  res.json(new ApiResponse({ sentTo: count }));
});
