import webpush from 'web-push';
import { DelegatePushSubscription } from '../models/DelegatePushSubscription.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Reuses the same VAPID keypair as push.service.ts (admin push) — it's just a
// signing identity for the browser Push API, not scoped to an audience, so one
// keypair safely serves both admin and delegate subscriptions.
const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

const sendToSubscription = async (
  sub: { _id: unknown; endpoint: string; keys?: { p256dh: string; auth: string } | null },
  body: string
): Promise<void> => {
  if (!sub.keys) return;
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await DelegatePushSubscription.deleteOne({ _id: sub._id });
    } else {
      logger.error({ err, subscriptionId: sub._id }, 'Failed to send delegate web push');
    }
  }
};

// Broadcasts an announcement to every subscribed delegate device — used for
// event-day updates (venue changes, session reminders) sent from the admin portal.
export const sendPushToAllDelegates = async (payload: PushPayload): Promise<number> => {
  if (!configured) {
    logger.info({ payload }, '🔔 [DEV DELEGATE PUSH — not actually sent, VAPID keys unset]');
    return 0;
  }
  const subscriptions = await DelegatePushSubscription.find();
  const body = JSON.stringify(payload);
  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, body)));
  return subscriptions.length;
};

// Targets a single delegate — used for meeting-request notifications.
export const sendPushToRegistration = async (registrationId: string, payload: PushPayload): Promise<void> => {
  if (!configured) {
    logger.info({ registrationId, payload }, '🔔 [DEV DELEGATE PUSH — not actually sent, VAPID keys unset]');
    return;
  }
  const subscriptions = await DelegatePushSubscription.find({ registration: registrationId });
  if (subscriptions.length === 0) return;
  const body = JSON.stringify(payload);
  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, body)));
};
