import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { WaiHealthRegistrationDoc } from '../models/WaiHealthRegistration.model.js';
import { splitFullName, sanitizePhone, PHONE_FALLBACK, OnevieApiError } from './onevie.service.js';

type WaiHealthRegistrationHydrated = HydratedDocument<WaiHealthRegistrationDoc>;

// Check-in vendor sync for the WAI-Health Breakfast's own limited-seating
// room — a SEPARATE Onevie event from the main Summit's (see
// AIHS-women delegate sync.md, the vendor's spec for this one). Same "never
// let Onevie generate its own code, never email anyone from their side"
// rules as onevie.service.ts, just a different event id/API key and exactly
// one ticket type (no type/ticketCategory branching needed — every row here
// is the same "Women Delegate" ticket).
const configured = Boolean(env.ONEVIE_WAI_API_KEY);
export const onevieWaiConfigured = configured;

const WAI_REGISTRATIONS_URL = `${env.ONEVIE_API_BASE_URL.replace(/\/$/, '')}/api/v1/integrations/events/${env.ONEVIE_WAI_EVENT_ID}/registrations`;

// Fixed Onevie-side id from the vendor's "AIHS-women delegate sync" doc —
// "Women Delegate" ticket type, not something we can look up ourselves.
const WOMEN_DELEGATE_TICKET_TYPE_ID = '1b55f4fe-39ab-4e35-aea8-b8149a50269b';

interface OnevieWaiPayload {
  external_reference: string;
  qr_secret: string;
  ticket_type_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  send_confirmation_email: false;
}

export const buildOnevieWaiPayload = (registration: WaiHealthRegistrationHydrated): OnevieWaiPayload => {
  if (!registration.checkinQrToken) {
    throw new Error(`WaiHealthRegistration ${registration.id} has no checkinQrToken — cannot build a qr_secret`);
  }
  const { firstName, lastName } = splitFullName(registration.fullName);
  const phone = sanitizePhone(registration.phone || '') || PHONE_FALLBACK;

  return {
    external_reference: registration.checkinQrToken,
    qr_secret: registration.checkinQrToken,
    ticket_type_id: WOMEN_DELEGATE_TICKET_TYPE_ID,
    first_name: firstName,
    last_name: lastName,
    email: registration.email.toLowerCase().trim(),
    phone,
    send_confirmation_email: false,
  };
};

// POSTs one WAI registration. Throws OnevieApiError on any non-2xx response —
// onevieWaiSync.job.ts decides how to record that; this function has no DB
// access of its own, same split as syncRegistrationToOnevie.
export const syncWaiRegistrationToOnevie = async (registration: WaiHealthRegistrationHydrated): Promise<{ idempotentReplay: boolean }> => {
  if (!configured) throw new Error('Onevie WAI sync is not configured (ONEVIE_WAI_API_KEY unset)');

  const payload = buildOnevieWaiPayload(registration);

  const res = await fetch(WAI_REGISTRATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.ONEVIE_WAI_API_KEY },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as
    | { data?: { qr_payload?: string; idempotent_replay?: boolean }; message?: string }
    | null;

  if (!res.ok) {
    const message = body?.message || `Onevie WAI sync failed with status ${res.status}`;
    throw new OnevieApiError(res.status, message);
  }

  if (body?.data?.qr_payload && body.data.qr_payload !== payload.qr_secret) {
    logger.error(
      { registrationId: registration.id, sent: payload.qr_secret, returned: body.data.qr_payload },
      'Onevie WAI sync returned a different qr_payload than the qr_secret we sent'
    );
  }

  return { idempotentReplay: Boolean(body?.data?.idempotent_replay) };
};
