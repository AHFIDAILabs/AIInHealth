import { Notification } from '../models/Notification.model.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';
import { sendPushForEvent } from './push.service.js';
import { logger } from '../config/logger.js';
import type { NotificationEvent } from '../types/enums.js';

interface EmitParams {
  type: NotificationEvent;
  title: string;
  body?: string;
  resourceType: string;
  resourceId: string;
}

// Called from the three public-facing create endpoints (registration/inquiry/
// contact) — persists so the bell has something to show on next login even if no
// one was connected at the moment it happened, then pushes live to anyone who is.
export const emitAdminNotification = async ({ type, title, body, resourceType, resourceId }: EmitParams): Promise<void> => {
  const notification = await Notification.create({ type, title, body, resourceType, resourceId });
  broadcastAdminEvent('notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    resourceType: notification.resourceType,
    resourceId: notification.resourceId,
    createdAt: notification.createdAt,
  });

  // Push reaches an opted-in device even with no browser tab open — best-effort,
  // never lets a push provider hiccup affect the socket broadcast that already succeeded.
  sendPushForEvent(type, { title, body }).catch((err) => logger.error({ err, type }, 'sendPushForEvent failed'));
};
