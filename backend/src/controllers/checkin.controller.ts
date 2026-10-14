import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { recordAudit } from '../services/audit.service.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';
import { qrDataUrlForToken } from '../services/qr.service.js';
import { isFreeRegistration } from '../utils/registrationChannel.js';
import { classifyBadgeCategory } from '../utils/badgeCategory.js';
import { GENDERS } from '../types/enums.js';

// Staff-only visual cue, not shown anywhere in words on the badge itself:
// within the "Delegate" print category specifically — the one bucket that
// covers a lot of different PAID ticket categories as well as every free
// seat — a free Delegate's QR prints in this colour instead of the standard
// black every other badge (paid Delegate, Speaker, VIP, Organizer, etc.)
// uses. Dark enough to keep scanning reliably (QR decoding depends on
// contrast against the white background, not colour), but worth a real
// print+scan test against the actual badge printer before relying on it at
// scale — see qr.service.ts's qrDataUrlForToken comment.
const FREE_DELEGATE_QR_COLOR = '#1E3A8A';

interface SummarizableRegistration {
  id?: string;
  _id?: unknown;
  fullName?: string | null;
  contactName?: string | null;
  companyName?: string | null;
  type: string;
  ticketCategory?: string | null;
  organization?: string | null;
  checkedIn: boolean;
  checkedInAt?: Date | null;
  isActive?: boolean;
  gender?: string | null;
  groupAttendees?: {
    fullName?: string | null;
    email?: string | null;
    checkedIn?: boolean | null;
    checkedInAt?: Date | null;
    gender?: string | null;
  }[];
}

// Every group member checks in/out independently of the primary contact and
// of each other (Registration.model.ts's groupAttendees now carries its own
// qrToken/checkedIn/checkedInAt per member) — `memberIndex` picks out which
// PERSON within the registration this summary describes. Omitted (or out of
// range), it falls back to the primary contact's own top-level fields, which
// is the only case that existed before groups got individual check-in.
const summarizePerson = (r: SummarizableRegistration, memberIndex?: number) => {
  const member = memberIndex !== undefined ? r.groupAttendees?.[memberIndex] : undefined;
  return {
    id: r.id ?? String(r._id),
    name: member ? member.fullName || 'Group member' : r.fullName || r.contactName || r.companyName || 'Unknown',
    type: r.type,
    ticketCategory: r.ticketCategory ?? undefined,
    organization: r.organization || r.companyName || undefined,
    checkedIn: member ? Boolean(member.checkedIn) : r.checkedIn,
    checkedInAt: member ? member.checkedInAt : r.checkedInAt,
    isActive: r.isActive,
    gender: (member ? member.gender : r.gender) ?? undefined,
  };
};

// Self-reported at the door — optional, so a busy entrance never stalls on
// it (an omitted value is simply not recorded, never an error); an invalid
// one IS rejected, since that can only mean a broken integration, not a
// person declining to answer (that's what 'prefer_not_to_say' is for).
const parseGender = (body: unknown): (typeof GENDERS)[number] | undefined => {
  const raw = (body as { gender?: unknown })?.gender;
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || !(GENDERS as readonly string[]).includes(raw)) {
    throw new ApiError(422, `gender must be one of: ${GENDERS.join(', ')}`, 'VALIDATION_ERROR');
  }
  return raw as (typeof GENDERS)[number];
};

// POST /admin/check-in/scan — body: { qrToken, gender? }
export const scan = catchAsync(async (req: Request, res: Response) => {
  const qrToken = typeof req.body?.qrToken === 'string' ? req.body.qrToken.trim() : '';
  if (!qrToken) throw new ApiError(422, 'qrToken is required', 'VALIDATION_ERROR');
  const gender = parseGender(req.body);

  // Try the primary contact's own token first — atomic for the same reason as
  // before: a shared/photographed QR scanned at two lanes at once could
  // otherwise have both requests read checkedIn:false before either write
  // lands, checking the same ticket in twice.
  let registration = await Registration.findOneAndUpdate(
    { qrToken, status: 'confirmed', isActive: true, checkedIn: false },
    { $set: { checkedIn: true, checkedInAt: new Date(), ...(gender && { gender }) } },
    { new: true }
  );
  let memberIndex: number | undefined;

  // No primary match — try a group member's own token. $elemMatch (not a
  // separate top-level dot condition) is what lets the `$` positional
  // operator below update exactly the element that satisfied BOTH
  // conditions (this token, not yet checked in), same atomicity guarantee
  // as the primary-contact branch above.
  if (!registration) {
    registration = await Registration.findOneAndUpdate(
      {
        status: 'confirmed',
        isActive: true,
        groupAttendees: { $elemMatch: { qrToken, checkedIn: { $ne: true } } },
      },
      {
        $set: {
          'groupAttendees.$.checkedIn': true,
          'groupAttendees.$.checkedInAt': new Date(),
          ...(gender && { 'groupAttendees.$.gender': gender }),
        },
      },
      { new: true }
    );
    if (registration) {
      memberIndex = registration.groupAttendees?.findIndex((m) => m.qrToken === qrToken);
    }
  }

  if (!registration) {
    const existing = await Registration.findOne({ $or: [{ qrToken }, { 'groupAttendees.qrToken': qrToken }] });
    if (!existing) throw new ApiError(404, "That QR code doesn't match any registration.", 'NOT_FOUND');
    if (existing.status !== 'confirmed') {
      throw new ApiError(400, 'This registration is not confirmed and cannot be checked in.', 'NOT_CONFIRMED');
    }
    if (!existing.isActive) {
      throw new ApiError(403, 'This registration has been deactivated.', 'REGISTRATION_INACTIVE');
    }
    const existingMemberIndex = existing.qrToken === qrToken ? undefined : existing.groupAttendees?.findIndex((m) => m.qrToken === qrToken);
    const person = summarizePerson(existing, existingMemberIndex);
    throw new ApiError(
      409,
      `${person.name} already checked in at ${person.checkedInAt?.toLocaleString('en-GB') ?? 'an earlier time'}.`,
      'ALREADY_CHECKED_IN'
    );
  }

  await recordAudit({
    req,
    action: 'registration.checked_in',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { checkedIn: true, memberIndex },
  });

  const summary = summarizePerson(registration, memberIndex);
  broadcastAdminEvent('checkin', summary);
  res.json(new ApiResponse(summary));
});

// GET /admin/check-in/search?q= — manual fallback when the camera/QR can't be
// used. Returns one row per PERSON (primary contact, and separately each
// group member whose own name/email matches) rather than one row per
// registration — a group registration's members live inside one document,
// but each needs their own row here so staff can check in exactly the one
// person in front of them, not "the registration" as an undifferentiated
// block.
export const search = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.json(new ApiResponse([]));
    return;
  }
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const items = await Registration.find({
    status: 'confirmed',
    $or: [
      { fullName: rx },
      { email: rx },
      { contactName: rx },
      { companyName: rx },
      { 'groupAttendees.fullName': rx },
      { 'groupAttendees.email': rx },
    ],
  })
    // Headroom above the final 15-row cap below — one matched document can
    // expand into several rows (the primary plus however many of their
    // group members also matched).
    .limit(30)
    .lean();

  const rows: (ReturnType<typeof summarizePerson> & { qrPresent: boolean; memberIndex?: number })[] = [];
  for (const r of items) {
    if (rx.test(r.fullName ?? '') || rx.test(r.email ?? '') || rx.test(r.contactName ?? '') || rx.test(r.companyName ?? '')) {
      rows.push({ ...summarizePerson({ ...r, id: String(r._id) }), qrPresent: Boolean(r.qrToken) });
    }
    (r.groupAttendees ?? []).forEach((m, i) => {
      if (rx.test(m.fullName ?? '') || rx.test(m.email ?? '')) {
        rows.push({ ...summarizePerson({ ...r, id: String(r._id) }, i), qrPresent: Boolean(m.qrToken), memberIndex: i });
      }
    });
    if (rows.length >= 15) break;
  }

  res.json(new ApiResponse(rows.slice(0, 15)));
});

// POST /admin/check-in/manual/:id — check in without scanning (e.g.
// lost/undelivered QR). body: { memberIndex?, gender? } — omitted memberIndex
// checks in the primary contact (unchanged default behavior); a number
// checks in that one group member instead.
export const manualCheckIn = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const rawMemberIndex = req.body?.memberIndex;
  const memberIndex =
    typeof rawMemberIndex === 'number' && Number.isInteger(rawMemberIndex) && rawMemberIndex >= 0 ? rawMemberIndex : undefined;
  const gender = parseGender(req.body);

  // Atomic for the same reason as scan() above — two staff hitting "check in"
  // on the same person at once shouldn't both succeed.
  const registration =
    memberIndex === undefined
      ? await Registration.findOneAndUpdate(
          { _id: req.params.id, status: 'confirmed', isActive: true, checkedIn: false },
          { $set: { checkedIn: true, checkedInAt: new Date(), ...(gender && { gender }) } },
          { new: true }
        )
      : await Registration.findOneAndUpdate(
          {
            _id: req.params.id,
            status: 'confirmed',
            isActive: true,
            [`groupAttendees.${memberIndex}`]: { $exists: true },
            [`groupAttendees.${memberIndex}.checkedIn`]: { $ne: true },
          },
          {
            $set: {
              [`groupAttendees.${memberIndex}.checkedIn`]: true,
              [`groupAttendees.${memberIndex}.checkedInAt`]: new Date(),
              ...(gender && { [`groupAttendees.${memberIndex}.gender`]: gender }),
            },
          },
          { new: true }
        );

  if (!registration) {
    const existing = await Registration.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
    if (existing.status !== 'confirmed') {
      throw new ApiError(400, 'This registration is not confirmed and cannot be checked in.', 'NOT_CONFIRMED');
    }
    if (!existing.isActive) {
      throw new ApiError(403, 'This registration has been deactivated.', 'REGISTRATION_INACTIVE');
    }
    throw new ApiError(409, 'Already checked in.', 'ALREADY_CHECKED_IN');
  }

  await recordAudit({
    req,
    action: 'registration.checked_in',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { checkedIn: true, method: 'manual', memberIndex },
  });

  const summary = summarizePerson(registration, memberIndex);
  broadcastAdminEvent('checkin', summary);
  res.json(new ApiResponse(summary));
});

// GET /admin/check-in/badge/:id?memberIndex= — the printable payload for a
// physical name-tag sticker: name, organization, role/title (one of
// badgeCategory.ts's 7 fixed print categories — no "Sponsored"/"Invited
// Guest" wording on a badge; that distinction only shows up as the Delegate
// QR colour cue below), and a rendered QR image of THIS person's own
// check-in token — everything a connected label printer needs in one call.
// Read-only — printing a badge is a separate concern from actually checking
// someone in; scan()/manualCheckIn() above still own that state change, and
// a badge can be (re)printed any number of times without affecting it.
export const getBadge = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
  const rawMemberIndex = req.query.memberIndex;
  const memberIndex =
    typeof rawMemberIndex === 'string' && /^\d+$/.test(rawMemberIndex) ? Number(rawMemberIndex) : undefined;

  const registration = await Registration.findById(req.params.id);
  if (!registration) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');

  const member = memberIndex !== undefined ? registration.groupAttendees?.[memberIndex] : undefined;
  if (memberIndex !== undefined && !member) throw new ApiError(404, 'Group member not found', 'NOT_FOUND');

  // Each group member checks in on their OWN qrToken, not the primary
  // contact's — same token the badge's QR must encode for THIS person.
  const token = member ? member.qrToken : registration.qrToken;
  if (registration.status !== 'confirmed' || !token) {
    throw new ApiError(400, "This registration isn't confirmed yet — no badge can be printed until it is.", 'NOT_CONFIRMED');
  }

  const { name, organization } = summarizePerson(registration, memberIndex);
  const badgeCategory = classifyBadgeCategory(registration);
  // The QR colour cue only matters within "Delegate" — the one print
  // category that covers both a lot of different PAID ticket categories and
  // every free seat, so paid vs free is otherwise invisible on the badge.
  // Every other badgeCategory always prints the standard colour regardless
  // of payment (a free Speaker/Organizer/etc. looks the same as a paid one —
  // management only asked for this cue on Delegate).
  const qrColor = badgeCategory === 'Delegate' && isFreeRegistration(registration) ? FREE_DELEGATE_QR_COLOR : undefined;

  res.json(
    new ApiResponse({
      name,
      organization,
      // Group members print under the shared registration's own job title —
      // there's no per-member jobTitle field (Registration.model.ts's
      // groupAttendees sub-schema only carries fullName/email/qrToken/
      // checkedIn/checkedInAt), same reasoning as organization in
      // summarizePerson above.
      jobTitle: registration.jobTitle || undefined,
      badgeCategory,
      qrToken: token,
      qrImage: await qrDataUrlForToken(token, qrColor),
    })
  );
});

// GET /admin/check-in/stats — small counter for the CheckInPage header.
// Counts PEOPLE (primary contacts + every group member), not registrations —
// a group registration of 5 should read as 5 confirmed/checked-in people at
// the door, the same headcount staff are physically seeing. Deliberately
// spans every registration type (check-in itself does — see scan()/
// manualCheckIn() above), unlike attendee.controller.ts's adminStats, which
// is attendee-only. The two are shown under the same "Confirmed"/"Checked
// In" labels on different pages, so CheckInPage.tsx marks these "(All)" to
// avoid reading as a discrepancy.
export const stats = catchAsync(async (_req: Request, res: Response) => {
  const [agg] = await Registration.aggregate<{ confirmed: number; checkedIn: number }>([
    { $match: { status: 'confirmed' } },
    {
      $project: {
        peopleCount: { $add: [1, { $size: { $ifNull: ['$groupAttendees', []] } }] },
        checkedInCount: {
          $add: [
            { $cond: [{ $eq: ['$checkedIn', true] }, 1, 0] },
            {
              $size: {
                $filter: {
                  input: { $ifNull: ['$groupAttendees', []] },
                  as: 'm',
                  cond: { $eq: ['$$m.checkedIn', true] },
                },
              },
            },
          ],
        },
      },
    },
    { $group: { _id: null, confirmed: { $sum: '$peopleCount' }, checkedIn: { $sum: '$checkedInCount' } } },
  ]);
  res.json(new ApiResponse({ confirmed: agg?.confirmed ?? 0, checkedIn: agg?.checkedIn ?? 0 }));
});
