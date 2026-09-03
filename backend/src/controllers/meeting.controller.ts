import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { MeetingRequest } from '../models/MeetingRequest.model.js';
import { sendPushToRegistration } from '../services/delegatePush.service.js';
import { logger } from '../config/logger.js';
import type { CreateMeetingRequestInput, RespondMeetingRequestInput } from '../validations/meeting.validation.js';

type RegLean = Pick<
  RegistrationDoc,
  'type' | 'fullName' | 'contactName' | 'companyName' | 'organization' | 'jobTitle' | 'email' | 'contactEmail'
> & { _id: unknown };

const publicName = (r: RegLean) => r.fullName || r.contactName || r.companyName || 'Delegate';
const org = (r: RegLean) => r.organization || r.companyName || undefined;
const emailOf = (r: RegLean) => r.email || r.contactEmail || undefined;

// GET /delegate/directory — other opted-in, confirmed delegates. No contact info
// here; email is only revealed once a meeting request between the two is accepted.
export const directory = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter: Record<string, unknown> = {
    status: 'confirmed',
    directoryOptIn: true,
    _id: { $ne: req.delegate!.registrationId },
  };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { contactName: rx }, { companyName: rx }, { organization: rx }];
  }

  const items = await Registration.find(filter)
    .select('type fullName contactName companyName organization jobTitle')
    .sort({ fullName: 1, companyName: 1 })
    .limit(200)
    .lean();

  res.json(
    new ApiResponse(
      items.map((r) => ({ id: r._id, type: r.type, name: publicName(r as RegLean), organization: org(r as RegLean), jobTitle: r.jobTitle }))
    )
  );
});

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const { toRegistrationId, message } = req.body as CreateMeetingRequestInput;
  const fromId = req.delegate!.registrationId;

  if (!isValidObjectId(toRegistrationId)) throw new ApiError(404, 'Delegate not found', 'NOT_FOUND');
  if (toRegistrationId === fromId) throw new ApiError(400, "You can't request a meeting with yourself.", 'INVALID_TARGET');

  const [from, to] = await Promise.all([
    Registration.findById(fromId),
    Registration.findOne({ _id: toRegistrationId, status: 'confirmed', directoryOptIn: true }),
  ]);
  if (!from) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  if (!to) throw new ApiError(404, 'That delegate is not available for meeting requests.', 'NOT_FOUND');

  let meeting;
  try {
    meeting = await MeetingRequest.create({ fromRegistration: fromId, toRegistration: toRegistrationId, message });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw new ApiError(409, "You already have a pending request with this delegate.", 'DUPLICATE_REQUEST');
    }
    throw err;
  }

  sendPushToRegistration(toRegistrationId, {
    title: 'New meeting request',
    body: `${publicName(from as unknown as RegLean)} wants to connect`,
    url: '/portal/meetings',
  }).catch((err) => logger.error({ err }, 'sendPushToRegistration failed'));

  res.status(201).json(new ApiResponse({ id: meeting.id, status: meeting.status }));
});

const serializeMeeting = (m: {
  id: string;
  status: string;
  message?: string | null;
  createdAt: Date;
  respondedAt?: Date | null;
  fromRegistration: RegLean;
  toRegistration: RegLean;
}, viewerId: string) => {
  const counterpart = String(m.fromRegistration._id) === viewerId ? m.toRegistration : m.fromRegistration;
  const direction = String(m.fromRegistration._id) === viewerId ? 'sent' : 'received';
  return {
    id: m.id,
    status: m.status,
    message: m.message,
    createdAt: m.createdAt,
    respondedAt: m.respondedAt,
    direction,
    counterpart: {
      id: counterpart._id,
      name: publicName(counterpart),
      organization: org(counterpart),
      email: m.status === 'accepted' ? emailOf(counterpart) : undefined,
    },
  };
};

export const listRequests = catchAsync(async (req: Request, res: Response) => {
  const viewerId = req.delegate!.registrationId;
  const selectFields = 'type fullName contactName companyName organization jobTitle email contactEmail';
  // No .lean() here — serializeMeeting reads the `id` virtual, which lean() strips.
  const meetings = await MeetingRequest.find({ $or: [{ fromRegistration: viewerId }, { toRegistration: viewerId }] })
    .populate('fromRegistration', selectFields)
    .populate('toRegistration', selectFields)
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(meetings.map((m) => serializeMeeting(m as never, viewerId))));
});

export const respond = catchAsync(async (req: Request, res: Response) => {
  const { action } = req.body as RespondMeetingRequestInput;
  const viewerId = req.delegate!.registrationId;

  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Meeting request not found', 'NOT_FOUND');
  const meeting = await MeetingRequest.findById(req.params.id);
  if (!meeting) throw new ApiError(404, 'Meeting request not found', 'NOT_FOUND');
  if (meeting.status !== 'pending') throw new ApiError(400, 'This request has already been resolved.', 'ALREADY_RESOLVED');

  const isRecipient = meeting.toRegistration.toString() === viewerId;
  const isSender = meeting.fromRegistration.toString() === viewerId;

  if ((action === 'accept' || action === 'decline') && !isRecipient) {
    throw new ApiError(403, 'Only the recipient can respond to this request.', 'FORBIDDEN');
  }
  if (action === 'cancel' && !isSender) {
    throw new ApiError(403, 'Only the sender can cancel this request.', 'FORBIDDEN');
  }

  meeting.status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
  meeting.respondedAt = new Date();
  await meeting.save();

  if (action === 'accept' || action === 'decline') {
    sendPushToRegistration(meeting.fromRegistration.toString(), {
      title: action === 'accept' ? 'Meeting request accepted' : 'Meeting request declined',
      url: '/portal/meetings',
    }).catch((err) => logger.error({ err }, 'sendPushToRegistration failed'));
  }

  res.json(new ApiResponse({ id: meeting.id, status: meeting.status }));
});
