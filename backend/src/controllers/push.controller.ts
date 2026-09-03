import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { PushSubscription } from '../models/PushSubscription.model.js';
import { env } from '../config/env.js';
import type { SubscribePushInput, UnsubscribePushInput } from '../validations/push.validation.js';

export const publicKey = catchAsync(async (_req: Request, res: Response) => {
  res.json(new ApiResponse({ publicKey: env.VAPID_PUBLIC_KEY, configured: Boolean(env.VAPID_PUBLIC_KEY) }));
});

export const subscribe = catchAsync(async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body as SubscribePushInput;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user!.sub, endpoint, keys },
    { upsert: true, new: true }
  );
  res.status(201).json(new ApiResponse({ ok: true }));
});

export const unsubscribe = catchAsync(async (req: Request, res: Response) => {
  const { endpoint } = req.body as UnsubscribePushInput;
  await PushSubscription.deleteOne({ endpoint, user: req.user!.sub });
  res.json(new ApiResponse({ ok: true }));
});
