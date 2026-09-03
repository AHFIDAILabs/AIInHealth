import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.model.js';
import { User } from '../models/User.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { NotificationEvent } from '../types/enums.js';

const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
export const pushConfigured = configured;
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

// Fans a push out to every staff member who has opted in (notificationPrefs.pushEnabled)
// and subscribed to this specific event type — mirrors the Socket.IO broadcast's
// audience but reaches a device even when no browser tab is open.
export const sendPushForEvent = async (type: NotificationEvent, payload: PushPayload): Promise<void> => {
  if (!configured) {
    logger.info({ type, payload }, '🔔 [DEV PUSH — not actually sent, VAPID keys unset]');
    return;
  }

  const recipients = await User.find({
    isActive: true,
    'notificationPrefs.pushEnabled': true,
    'notificationPrefs.events': type,
  }).select('_id');
  if (recipients.length === 0) return;

  const subscriptions = await PushSubscription.find({ user: { $in: recipients.map((r) => r._id) } });
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      if (!sub.keys) return; // required in the schema — defensive only, keeps TS happy
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          body
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked by the browser — clean it up rather
          // than retrying it forever.
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.error({ err, subscriptionId: sub.id }, 'Failed to send web push');
        }
      }
    })
  );
};

// Sends a push to every subscription the requesting admin has themselves, ignoring
// their notificationPrefs — this is a deliberate "did this actually reach my
// device" check triggered from Integrations, not a real event notification.
export const sendTestPush = async (userId: string): Promise<number> => {
  if (!configured) return 0;
  const subscriptions = await PushSubscription.find({ user: userId });
  const body = JSON.stringify({ title: 'Test push — AI in Health Summit 2026', body: 'Push notifications are working.' });
  await Promise.all(
    subscriptions.map((sub) => {
      if (!sub.keys) return Promise.resolve();
      return webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, body)
        .catch((err: unknown) => logger.error({ err, subscriptionId: sub.id }, 'Test push failed'));
    })
  );
  return subscriptions.length;
};
