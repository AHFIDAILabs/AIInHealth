import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
const client = configured ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) : null;

export const twilioConfigured = configured;

// Twilio's own signature scheme (unlike Paystack's raw-body HMAC) is computed
// from the full webhook URL plus the PARSED form params — no raw-body capture
// needed (see app.ts's plain express.urlencoded(), no verify callback). Uses
// env.PUBLIC_API_URL rather than reconstructing the URL from request headers
// — Twilio's own docs recommend validating against the exact URL configured
// in the console, which is this fixed, admin-set value, not whatever a proxy
// header happens to say.
export const isValidTwilioWebhookSignature = (path: string, params: Record<string, unknown>, signatureHeader: string | undefined): boolean => {
  if (!configured || !signatureHeader) return false;
  const url = `${env.PUBLIC_API_URL}${path}`;
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signatureHeader, url, params as Record<string, string>);
};

// Dev fallback mirrors every other integration here (Paystack/email/push) —
// no credentials configured means this logs instead of actually calling out,
// so local dev can exercise the rest of the conversation flow without a live
// Twilio account.
export const sendWhatsAppMessage = async (to: string, body: string): Promise<void> => {
  if (!client) {
    logger.info({ to, body }, '📱 [DEV WHATSAPP — not actually sent, Twilio credentials unset]');
    return;
  }
  await client.messages.create({ from: env.TWILIO_WHATSAPP_FROM, to, body });
};
