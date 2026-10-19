import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { RegistrationDoc } from '../models/Registration.model.js';

type RegistrationHydrated = HydratedDocument<RegistrationDoc>;

// Check-in vendor sync — see docs/onevie-checkin-sync.md for the full spec
// this was built against (shared by the vendor's dev) and what we told them
// back. Onevie never generates a code or emails anyone here: `qr_secret` is
// always the exact `qrToken` already printed on the e-ticket we sent, and
// `send_confirmation_email` is always false. This file only builds/sends one
// person's payload; onevieSync.job.ts decides WHICH registrations to call it
// for and on what schedule.
const configured = Boolean(env.ONEVIE_API_KEY);
export const onevieConfigured = configured;

const REGISTRATIONS_URL = `${env.ONEVIE_API_BASE_URL.replace(/\/$/, '')}/api/v1/integrations/events/${env.ONEVIE_EVENT_ID}/registrations`;

// Fixed ticket_type_id values from the vendor's docs — these are Onevie-side
// ids, not something we can look up or validate against our own enums.
const TICKET_TYPE_IDS = {
  delegate: '95d3e53e-0c48-4c7f-a58d-f910bb9957a6',
  exhibitor: '255d3755-96c5-422c-b02a-379276fc5c31',
  innovator: 'efaa59b2-8670-4ba7-a6de-cc1a835a6cfb',
  media: '97553cbf-5db3-4f33-9610-2887f70c393f',
  organizer: 'e867582f-8e2e-435e-97fa-b87d4b2c6faf',
  speaker: '1b5b7b4d-5e51-4514-ac5b-ac364c3ed089',
  vip: 'ff7113ba-74d1-4a66-87ad-758270dc4070',
  volunteer: '24562dc1-f02d-4bd0-90ed-010d84d336e8',
} as const;

// Decided with the team: `sponsor` and `government_official` have no
// matching Onevie ticket type, so both check in as a regular Delegate —
// no special lane at the door for either.
export const mapOnevieTicketTypeId = (registration: Pick<RegistrationDoc, 'type' | 'ticketCategory'>): string => {
  switch (registration.type) {
    case 'exhibitor':
      return TICKET_TYPE_IDS.exhibitor;
    case 'innovator':
      return TICKET_TYPE_IDS.innovator;
    case 'volunteer':
      return TICKET_TYPE_IDS.volunteer;
    case 'team':
      return TICKET_TYPE_IDS.organizer;
    case 'sponsor':
      return TICKET_TYPE_IDS.delegate;
    case 'attendee':
    default:
      switch (registration.ticketCategory) {
        case 'speaker':
          return TICKET_TYPE_IDS.speaker;
        case 'vip':
          return TICKET_TYPE_IDS.vip;
        case 'accredited_media':
          return TICKET_TYPE_IDS.media;
        case 'staff':
          return TICKET_TYPE_IDS.organizer;
        default:
          return TICKET_TYPE_IDS.delegate;
      }
  }
};

// Strips everything except digits and a leading '+' — confirmed necessary
// against a real "Invalid phone number format" 400 caused by an invisible
// Unicode bidi-control character (U+202C) stuck onto an otherwise normal
// number, almost certainly from a copy-paste at registration time. Spaces,
// dashes and brackets get the same treatment since they'd fail the same way.
export const sanitizePhone = (raw: string): string => {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');
  return (hasPlus ? '+' : '') + digits;
};

// Onevie requires 1-50 char first/last name; our registrations only ever
// collect one free-text full name field. First token is the first name,
// everything else the last name — a single-token name repeats itself so
// last_name is never sent blank.
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Guest', lastName: 'Guest' };
  if (parts.length === 1) return { firstName: parts[0].slice(0, 50), lastName: parts[0].slice(0, 50) };
  return { firstName: parts[0].slice(0, 50), lastName: parts.slice(1).join(' ').slice(0, 50) };
};

interface OneviePayload {
  external_reference: string;
  qr_secret: string;
  ticket_type_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  send_confirmation_email: false;
  form_answers: { job_title: string; organization: string };
}

// Exhibitor, Sponsor AND Innovator all carry the company-contact field shape
// (companyName/contactName/contactEmail/contactPhone) — confirmed against
// live data after innovator registrations synced with a blank email because
// this set originally missed 'innovator', which has no fullName/email of its
// own at all (see Registration.model.ts's "Exhibitor & Sponsor shared" block
// — innovator was never listed there in the schema comments, but shares the
// exact same fields in practice).
const COMPANY_CONTACT_TYPES = new Set(['exhibitor', 'sponsor', 'innovator']);
export const isCompanyContactType = (type: string): boolean => COMPANY_CONTACT_TYPES.has(type);

// Exported so onevieSync.job.ts's duplicate-email detection resolves the
// exact same email Onevie will actually see — any drift between the two
// would silently defeat that check.
export const getOnevieEmail = (registration: Pick<RegistrationHydrated, 'type' | 'email' | 'contactEmail'>): string =>
  ((isCompanyContactType(registration.type) ? registration.contactEmail : registration.email) || '').toLowerCase().trim();

// Onevie's docs list `phone` as optional, but its live validation actually
// rejects a request with no phone at all ("phone is required") — confirmed
// against real 400s from registrations with no phone on file. Falling back
// to a placeholder rather than omitting the field entirely, since we have no
// real number to send for the ~15 registrations missing one.
export const PHONE_FALLBACK = '0000000000';

// Builds the exact request body — the one place that decides which of the
// two contact-field shapes this registration uses.
export const buildOneviePayload = (registration: RegistrationHydrated): OneviePayload => {
  const isCompanyContact = isCompanyContactType(registration.type);
  const rawName = (isCompanyContact ? registration.contactName : registration.fullName) || 'Guest';
  const { firstName, lastName } = splitFullName(rawName);
  const email = getOnevieEmail(registration);
  const rawPhone = (isCompanyContact ? registration.contactPhone : registration.phone) || '';
  const phone = sanitizePhone(rawPhone) || PHONE_FALLBACK;
  const organization = (isCompanyContact ? registration.companyName : registration.organization) || 'Not specified';
  // Exhibitor/Sponsor/Innovator have no job-title-equivalent field at all.
  const jobTitle = (isCompanyContact ? 'Representative' : registration.jobTitle) || 'Not specified';

  if (!registration.qrToken) {
    throw new Error(`Registration ${registration.id} has no qrToken — cannot build a qr_secret`);
  }

  return {
    external_reference: registration.qrToken,
    qr_secret: registration.qrToken,
    ticket_type_id: mapOnevieTicketTypeId(registration),
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    send_confirmation_email: false,
    form_answers: { job_title: jobTitle, organization },
  };
};

export class OnevieApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'OnevieApiError';
  }
}

// Shared POST + response validation — both the primary-contact sync below
// and syncGroupMemberToOnevie hit the same endpoint with the same shape of
// payload, just built from a different source (the registration itself vs.
// one of its groupAttendees). `logContext` is only for the "Onevie returned a
// different qr_payload" error log, so it's traceable back to whichever
// person's sync produced it.
const postOneviePayload = async (payload: OneviePayload, logContext: Record<string, unknown>): Promise<{ idempotentReplay: boolean }> => {
  if (!configured) throw new Error('Onevie is not configured (ONEVIE_API_KEY unset)');

  const res = await fetch(REGISTRATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.ONEVIE_API_KEY },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as
    | { data?: { qr_payload?: string; idempotent_replay?: boolean }; message?: string }
    | null;

  if (!res.ok) {
    const message = body?.message || `Onevie sync failed with status ${res.status}`;
    throw new OnevieApiError(res.status, message);
  }

  if (body?.data?.qr_payload && body.data.qr_payload !== payload.qr_secret) {
    // Should never happen — would mean Onevie silently generated its own
    // code instead of using ours, which is exactly what this integration
    // exists to prevent.
    logger.error(
      { ...logContext, sent: payload.qr_secret, returned: body.data.qr_payload },
      'Onevie returned a different qr_payload than the qr_secret we sent'
    );
  }

  return { idempotentReplay: Boolean(body?.data?.idempotent_replay) };
};

// POSTs one registration's PRIMARY contact. Throws OnevieApiError on any
// non-2xx response — the job decides how to record that against the
// registration; this function has no DB access of its own.
export const syncRegistrationToOnevie = async (registration: RegistrationHydrated): Promise<{ idempotentReplay: boolean }> => {
  const payload = buildOneviePayload(registration);
  return postOneviePayload(payload, { registrationId: registration.id });
};

export interface OnevieGroupMember {
  fullName?: string | null;
  email?: string | null;
  qrToken?: string | null;
}

// Builds a group member's OWN Onevie payload — their own qrToken as
// qr_secret (never the parent registration's), their own name/email, the
// same ticket type the parent registration itself would get (group members
// don't have an independent ticketCategory of their own), and always the
// phone fallback since groupAttendees has no phone field at all to sanitize.
export const buildOnevieGroupMemberPayload = (parent: RegistrationHydrated, member: OnevieGroupMember): OneviePayload => {
  if (!member.qrToken) {
    throw new Error(`Group member of registration ${parent.id} has no qrToken — cannot build a qr_secret`);
  }
  const { firstName, lastName } = splitFullName(member.fullName || 'Guest');
  const isCompanyContact = isCompanyContactType(parent.type);
  const organization = (isCompanyContact ? parent.companyName : parent.organization) || 'Not specified';

  return {
    external_reference: member.qrToken,
    qr_secret: member.qrToken,
    ticket_type_id: mapOnevieTicketTypeId(parent),
    first_name: firstName,
    last_name: lastName,
    email: (member.email || '').toLowerCase().trim(),
    phone: PHONE_FALLBACK,
    send_confirmation_email: false,
    form_answers: { job_title: 'Not specified', organization },
  };
};

// Same contract as syncRegistrationToOnevie, for one group member instead of
// the primary contact.
export const syncGroupMemberToOnevie = async (
  parent: RegistrationHydrated,
  member: OnevieGroupMember
): Promise<{ idempotentReplay: boolean }> => {
  const payload = buildOnevieGroupMemberPayload(parent, member);
  return postOneviePayload(payload, { parentRegistrationId: parent.id, memberEmail: member.email });
};
