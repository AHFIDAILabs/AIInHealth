import crypto from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { Session } from '../models/Session.model.js';
import { Registration } from '../models/Registration.model.js';
import { PortalMessage } from '../models/PortalMessage.model.js';
import { SessionAttendanceToken } from '../models/SessionAttendanceToken.model.js';
import { sendAttendanceLinkEmail } from './email.service.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { SESSION_ATTENDANCE_TOKEN_EXPIRES_AT } from '../config/event.js';
import { logger } from '../config/logger.js';

// Same construction as qr.service.ts's generateQrToken / rapporteurToken.service.ts's
// generateRapporteurToken — kept as its own function since a bearer link
// token and a check-in QR token are different credentials that happen to
// share a generator, not the same concept.
const generateAttendanceToken = (): string => crypto.randomBytes(24).toString('base64url');

export interface CreateAttendanceTokensInput {
  sessionId: string;
  // registrationId is set when the admin picked the volunteer from the
  // existing-registrations search (adminSearchVolunteers) rather than typing
  // a brand-new name — lets delivery go straight to that exact Registration's
  // portal without a second, fuzzier email lookup.
  volunteers: { name: string; email?: string; registrationId?: string }[];
  // The admin running this action — PortalMessage.sentBy requires a real
  // User ref, same as contact.controller.ts's adminReply attributing the
  // message to whichever admin clicked Reply.
  createdByUserId: string;
}

export interface CreatedAttendanceToken {
  tokenId: string;
  volunteerName: string;
  volunteerEmail?: string;
  portalUrl: string;
  emailed: boolean;
  deliveredToPortal: boolean;
}

interface SessionLike {
  id: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
}

// Finds the Registration to deliver this link to, preferring the exact one
// the admin picked via search over a fuzzier email match (an admin could
// otherwise type the right email for someone who happens to share it with an
// old/duplicate record).
const resolveDeliveryRegistration = async (
  volunteer: { email?: string; registrationId?: string }
): Promise<InstanceType<typeof Registration> | null> => {
  if (volunteer.registrationId && isValidObjectId(volunteer.registrationId)) {
    const byId = await Registration.findOne({ _id: volunteer.registrationId, status: 'confirmed', isActive: true });
    if (byId) return byId;
  }
  if (volunteer.email) {
    return Registration.findOne({
      status: 'confirmed',
      isActive: true,
      $or: [{ email: volunteer.email }, { contactEmail: volunteer.email }],
    }).sort({ createdAt: -1 });
  }
  return null;
};

// Emails the link and/or drops it in the volunteer's delegate portal as a
// PortalMessage with a copy-able actionUrl — mirrors contact.controller.ts's
// adminReply, which does the same "real email + portal copy, both best-
// effort" pairing for admin replies. Never throws: a failed delivery here
// shouldn't undo the token that was already created, since the admin can
// always fall back to copying portalUrl by hand (still returned either way).
const deliverToken = async (
  volunteer: { name: string; email?: string; registrationId?: string },
  portalUrl: string,
  session: SessionLike,
  createdByUserId: string
): Promise<{ emailed: boolean; deliveredToPortal: boolean }> => {
  let emailed = false;
  let deliveredToPortal = false;

  const registration = await resolveDeliveryRegistration(volunteer).catch(() => null);
  const email = volunteer.email || registration?.email || registration?.contactEmail || undefined;

  if (email) {
    try {
      await sendAttendanceLinkEmail(email, volunteer.name, {
        sessionTitle: session.title,
        day: session.day,
        startTime: session.startTime,
        room: session.room,
        portalUrl,
      });
      emailed = true;
    } catch (err) {
      logger.warn({ err, email }, 'sendAttendanceLinkEmail failed — token still created, portalUrl still returned for manual sharing');
    }
  }

  if (registration) {
    try {
      await PortalMessage.create({
        registration: registration._id,
        body: `You've been asked to take attendance for "${session.title}" (${session.day}, ${session.startTime} · Room ${session.room}). Tap the link below on your phone to start scanning e-tickets as people enter the room.`,
        sentBy: createdByUserId,
        actionUrl: portalUrl,
        actionLabel: 'Open my scanning link',
      });
      deliveredToPortal = true;
    } catch (err) {
      logger.warn({ err, registrationId: registration.id }, 'PortalMessage.create failed for attendance link delivery');
    }
  }

  return { emailed, deliveredToPortal };
};

// Creates one token per volunteer for the given session — deliberately NOT
// "one assignment per session" like rapporteurToken.service.ts's
// createRapporteurAssignment; a breakout room is staffed by several
// volunteers scanning in parallel on their own phones, so re-running this for
// the same session just adds more tokens rather than being rejected as a
// duplicate assignment.
export const createAttendanceTokens = async (
  input: CreateAttendanceTokensInput
): Promise<{ session: InstanceType<typeof Session>; tokens: CreatedAttendanceToken[] }> => {
  const session = await Session.findById(input.sessionId);
  if (!session) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  const sessionLike: SessionLike = { id: session.id, title: session.title, day: session.day, startTime: session.startTime, room: session.room };

  const tokens: CreatedAttendanceToken[] = [];
  for (const volunteer of input.volunteers) {
    const token = await SessionAttendanceToken.create({
      token: generateAttendanceToken(),
      session: session.id,
      volunteerName: volunteer.name,
      volunteerEmail: volunteer.email,
      expiresAt: SESSION_ATTENDANCE_TOKEN_EXPIRES_AT,
    });
    const portalUrl = `${env.FRONTEND_ORIGIN}/session-attendance/${token.token}`;
    const { emailed, deliveredToPortal } = await deliverToken(volunteer, portalUrl, sessionLike, input.createdByUserId);

    tokens.push({
      tokenId: token.id,
      volunteerName: token.volunteerName,
      volunteerEmail: token.volunteerEmail ?? undefined,
      portalUrl,
      emailed,
      deliveredToPortal,
    });
  }

  return { session, tokens };
};
