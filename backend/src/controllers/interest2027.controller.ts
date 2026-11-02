import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toCsv } from '../utils/toCsv.js';
import { Interest2027, type Interest2027Doc } from '../models/Interest2027.model.js';
import { Registration } from '../models/Registration.model.js';
import {
  submitInterest2027Schema,
  listInterest2027QuerySchema,
  INTEREST_2027_CONSENT_VERSION,
  type SubmitInterest2027Input,
  type ListInterest2027Query,
  type Interest2027InviteParams,
} from '../validations/interest2027.validation.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { env } from '../config/env.js';

// POST /2027-interest — public. Dedup by email: a second submission updates
// the same record instead of creating a duplicate row (brief section 8.3),
// with interestTypes UNIONED rather than overwritten — someone who first said
// "attend" and comes back later to also say "speak" shouldn't lose "attend".
export const submit = catchAsync(async (req: Request, res: Response) => {
  const { formMeta: _honeypot, inviteToken, consentGiven: _consentGiven, interestTypes, ...rest }: SubmitInterest2027Input =
    submitInterest2027Schema.parse({ body: req.body }).body;

  // The token only identifies the invite — it's never trusted to carry
  // prefill data itself, and a stale/invalid token just means this
  // submission isn't linked back to a 2026 registration, not an error.
  let source2026Registration: string | undefined;
  if (inviteToken) {
    const registration = await Registration.findOne({ interest2027Token: inviteToken }).select('_id');
    if (registration) source2026Registration = registration.id;
  }

  const existing = await Interest2027.findOne({ email: rest.email }).select('interestTypes');
  const mergedInterestTypes = existing ? [...new Set([...existing.interestTypes, ...interestTypes])] : interestTypes;

  const record = await Interest2027.findOneAndUpdate(
    { email: rest.email },
    {
      $set: {
        ...rest,
        interestTypes: mergedInterestTypes,
        consent: { given: true, textVersion: INTEREST_2027_CONSENT_VERSION, givenAt: new Date() },
        ...(source2026Registration ? { source2026Registration } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!existing) {
    await emitAdminNotification({
      type: 'interest2027.new',
      title: '2027 interest list — new signup',
      body: `${record.fullName} <${record.email}>`,
      resourceType: 'Interest2027',
      resourceId: record.id,
    });
  }

  res.status(201).json(new ApiResponse({ message: "You're on the 2027 list — thank you!" }));
});

// GET /2027-interest/invite/:token — public. Minimal prefill only (name +
// email), never the full registration — per the brief's "never expose
// registration data on an anonymous form" rule, this is the one exception,
// scoped to exactly the two fields the form needs to prefill, for someone who
// already holds a personal link.
export const inviteInfo = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as unknown as Interest2027InviteParams;
  const registration = await Registration.findOne({ interest2027Token: token }).select('fullName email');
  if (!registration) throw new ApiError(404, 'This link is invalid or has expired.', 'NOT_FOUND');

  res.json(new ApiResponse({ fullName: registration.fullName ?? null, email: registration.email ?? null }));
});

// POST /admin/registrations/:id/2027-interest-link — lazily generates (if
// missing) this registration's personalised invite token and returns the
// full /2027 link for the admin to copy/send manually. No bulk-send across
// the 2026 base is built in this checkpoint — that's a deliberate follow-up,
// same "explicit action, not bundled in" precedent as every other mass email
// this project has sent (WAI-Health thank-you, feedback invites/reminders).
export const adminGenerateInviteLink = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const registration = await Registration.findById(id).select('interest2027Token');
  if (!registration) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');

  if (!registration.interest2027Token) {
    registration.interest2027Token = crypto.randomBytes(24).toString('base64url');
    await registration.save();
  }

  res.json(new ApiResponse({ url: `${env.FRONTEND_ORIGIN}/2027?invite=${registration.interest2027Token}` }));
});

const buildFilter = (query: ListInterest2027Query): FilterQuery<Interest2027Doc> => {
  const filter: FilterQuery<Interest2027Doc> = {};
  if (query.interestType) filter.interestTypes = query.interestType;
  if (query.country) filter.country = new RegExp(`^${query.country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { organisation: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listInterest2027QuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Interest2027.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Interest2027.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const CSV_COLUMNS = [
  '_id',
  'fullName',
  'email',
  'phone',
  'whatsappOptIn',
  'organisation',
  'role',
  'country',
  'interestTypes',
  'consent.given',
  'consent.textVersion',
  'consent.givenAt',
  'createdAt',
];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = listInterest2027QuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const items = await Interest2027.find(filter).sort({ createdAt: -1 }).lean();

  // toCsv indexes columns by flat key only — flatten the nested consent block
  // so 'consent.given' etc. above actually resolve to a value.
  const rows = items.map((item) => ({
    ...item,
    'consent.given': item.consent?.given,
    'consent.textVersion': item.consent?.textVersion,
    'consent.givenAt': item.consent?.givenAt,
  }));

  const csv = toCsv(rows as unknown as Record<string, unknown>[], CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="2027-interest-list-${Date.now()}.csv"`);
  res.send(csv);
});
