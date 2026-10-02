import crypto from 'node:crypto';
import { Session } from '../models/Session.model.js';
import { SessionReport } from '../models/SessionReport.model.js';
import { RapporteurAccessToken } from '../models/RapporteurAccessToken.model.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { RAPPORTEUR_TOKEN_EXPIRES_AT } from '../config/event.js';

// Same construction as qr.service.ts's generateQrToken (crypto.randomBytes +
// base64url, no collision-check loop) — kept as its own function rather than
// importing that one directly, since a bearer login token and a check-in QR
// token are different credentials that happen to share a generator, not the
// same concept.
const generateRapporteurToken = (): string => crypto.randomBytes(24).toString('base64url');

export interface CreateRapporteurAssignmentInput {
  sessionId: string;
  rapporteurName: string;
  rapporteurEmail: string;
}

// Creates the SessionReport (status 'draft') and its RapporteurAccessToken
// together, atomically from the caller's point of view — admin.rapporteur.controller.ts's
// adminAssign calls this once per assignment. A session can only ever have one
// SessionReport (unique index), so re-assigning an already-assigned session is
// rejected here rather than silently creating a second report.
export const createRapporteurAssignment = async (
  input: CreateRapporteurAssignmentInput
): Promise<{ report: InstanceType<typeof SessionReport>; token: InstanceType<typeof RapporteurAccessToken>; portalUrl: string }> => {
  const session = await Session.findById(input.sessionId);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const existingReport = await SessionReport.findOne({ session: session.id });
  if (existingReport) {
    throw new ApiError(409, 'This session already has a rapporteur assignment.', 'ALREADY_ASSIGNED');
  }

  const report = await SessionReport.create({
    session: session.id,
    rapporteurName: input.rapporteurName,
    rapporteurEmail: input.rapporteurEmail,
    status: 'draft',
  });

  const token = await RapporteurAccessToken.create({
    token: generateRapporteurToken(),
    session: session.id,
    report: report.id,
    rapporteurName: input.rapporteurName,
    rapporteurEmail: input.rapporteurEmail,
    expiresAt: RAPPORTEUR_TOKEN_EXPIRES_AT,
  });

  const portalUrl = `${env.FRONTEND_ORIGIN}/rapporteur/${token.token}`;
  return { report, token, portalUrl };
};
