import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Notification } from '../models/Notification.model.js';

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ readBy: { $ne: userId } });

  res.json(
    new ApiResponse(
      notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        resourceType: n.resourceType,
        resourceId: n.resourceId,
        createdAt: n.createdAt,
        isRead: n.readBy.some((id) => id.toString() === userId),
      })),
      { unreadCount }
    )
  );
});

export const adminMarkRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  await Notification.updateOne({ _id: req.params.id }, { $addToSet: { readBy: userId } });
  res.json(new ApiResponse({ ok: true }));
});

export const adminMarkAllRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  await Notification.updateMany({ readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
  res.json(new ApiResponse({ ok: true }));
});
