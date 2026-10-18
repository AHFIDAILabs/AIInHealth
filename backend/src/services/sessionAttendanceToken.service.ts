import crypto from 'node:crypto';
import { Session } from '../models/Session.model.js';
import { SessionAttendanceToken } from '../models/SessionAttendanceToken.model.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { SESSION_ATTENDANCE_TOKEN_EXPIRES_AT } from '../config/event.js';

// Same construction as qr.service.ts's generateQrToken / rapporteurToken.service.ts's
// generateRapporteurToken — kept as its own function since a bearer link
// token and a check-in QR token are different credentials that happen to
// share a generator, not the same concept.
const generateAttendanceToken = (): string => crypto.randomBytes(24).toString('base64url');

export interface CreateAttendanceTokensInput {
  sessionId: string;
  volunteers: { name: string; email?: string }[];
}

export interface CreatedAttendanceToken {
  tokenId: string;
  volunteerName: string;
  volunteerEmail?: string;
  portalUrl: string;
}

// Creates one token per volunteer for the given session — deliberately NOT
// "one assignment per session" like rapporteurToken.service.ts's
// createRapporteurAssignment; a breakout room is staffed by several
// volunteers scanning in parallel on their own phones, so re-running this for
// the same session just adds more tokens rather than being rejected as a
// duplicate assignment.
export const createAttendanceTokens = async (input: CreateAttendanceTokensInput): Promise<{ session: InstanceType<typeof Session>; tokens: CreatedAttendanceToken[] }> => {
  const session = await Session.findById(input.sessionId);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');

  const tokens: CreatedAttendanceToken[] = [];
  for (const volunteer of input.volunteers) {
    const token = await SessionAttendanceToken.create({
      token: generateAttendanceToken(),
      session: session.id,
      volunteerName: volunteer.name,
      volunteerEmail: volunteer.email,
      expiresAt: SESSION_ATTENDANCE_TOKEN_EXPIRES_AT,
    });
    tokens.push({
      tokenId: token.id,
      volunteerName: token.volunteerName,
      volunteerEmail: token.volunteerEmail ?? undefined,
      portalUrl: `${env.FRONTEND_ORIGIN}/session-attendance/${token.token}`,
    });
  }

  return { session, tokens };
};
