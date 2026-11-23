import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { ReportAccess, type ReportAccessDoc } from '../models/ReportAccess.model.js';
import { ApiError } from '../utils/ApiError.js';

// --- Access code (stable, reusable, hand-typed — same shape as
// reviewerToken.service.ts/delegateToken.service.ts) ---

const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (): string =>
  `RL-${Array.from({ length: 6 }, () => SAFE_ALPHABET[crypto.randomInt(SAFE_ALPHABET.length)]).join('')}`;

// Rolling window from issuance, not a fixed Summit-anchored cutoff (unlike
// config/event.ts's REVIEWER_ACCESS_CODE_EXPIRES_AT/DELEGATE_ACCESS_CODE_EXPIRES_AT)
// — the Reports Library has no event end date to anchor to; it's meant to
// stay live and keep attracting downloads long after the Summit itself.
const REPORT_ACCESS_CODE_VALID_DAYS = 180;

// Same "generate once, reuse until expiry" pattern as ensureReviewerAccessCode
// — every future request-code call for an email that already has a live code
// hands back that SAME code rather than invalidating it, so a visitor who
// noted theirs down never gets locked out by requesting it again.
export const ensureReportAccessCode = async (access: HydratedDocument<ReportAccessDoc>): Promise<string> => {
  const stillValid = access.accessCode && access.accessCodeExpiresAt && access.accessCodeExpiresAt > new Date();
  if (stillValid) return access.accessCode!;

  let code = randomCode();
  // eslint-disable-next-line no-await-in-loop
  while (await ReportAccess.exists({ accessCode: code })) code = randomCode();
  access.accessCode = code;
  access.accessCodeExpiresAt = new Date(Date.now() + REPORT_ACCESS_CODE_VALID_DAYS * 24 * 60 * 60 * 1000);
  await access.save();
  return code;
};

export const verifyReportAccessCode = async (email: string, code: string): Promise<string> => {
  const access = await ReportAccess.findOne({ email: email.trim().toLowerCase() });
  const normalizedCode = code.trim().toUpperCase();
  if (!access || !access.accessCode || access.accessCode !== normalizedCode) {
    throw new ApiError(400, 'That email/access code combination is invalid.', 'ACCESS_CODE_INVALID');
  }
  if (!access.accessCodeExpiresAt || access.accessCodeExpiresAt < new Date()) {
    throw new ApiError(400, 'This access code has expired. Request a new one.', 'ACCESS_CODE_EXPIRED');
  }
  return access.id;
};

// --- Session token (long-lived JWT cookie, no rotation) ---

export interface ReportSessionPayload {
  reportAccessId: string;
}

export const signReportSessionToken = (reportAccessId: string): string =>
  jwt.sign({ reportAccessId } satisfies ReportSessionPayload, env.REPORT_TOKEN_SECRET, {
    expiresIn: `${env.REPORT_SESSION_TTL_DAYS}d`,
  });

export const verifyReportSessionToken = (token: string): ReportSessionPayload => {
  try {
    return jwt.verify(token, env.REPORT_TOKEN_SECRET) as ReportSessionPayload;
  } catch {
    throw new ApiError(401, 'Your session has expired. Please verify your email again.', 'INVALID_REPORT_TOKEN');
  }
};
