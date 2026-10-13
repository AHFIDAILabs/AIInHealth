import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import { TICKET_CATEGORIES, PAYMENT_METHODS, ACCESS_CODE_DISCOUNTS } from '../types/enums.js';

const DAYS = 30;
const since = () => new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
const koboToNaira = (kobo: number): number => Math.round(kobo / 100);

// GET /admin/attendees-stats — the dedicated Attendees page's stat cards.
// CRUD for attendees themselves stays on the existing generic
// /admin/registrations endpoints (registration.controller.ts) — this exists
// purely for the numbers the reference layout wants above that table.
export const adminStats = catchAsync(async (_req: Request, res: Response) => {
  const [total, confirmed, checkedIn, revenueAgg] = await Promise.all([
    Registration.countDocuments({ type: 'attendee' }),
    Registration.countDocuments({ type: 'attendee', status: 'confirmed' }),
    Registration.countDocuments({ type: 'attendee', status: 'confirmed', checkedIn: true }),
    Registration.aggregate<{ total: number }>([
      { $match: { type: 'attendee', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amountKobo' } } },
    ]),
  ]);

  res.json(
    new ApiResponse({
      total,
      confirmed,
      checkedIn,
      checkInRate: confirmed ? Math.round((checkedIn / confirmed) * 100) : 0,
      revenueNaira: Math.round((revenueAgg[0]?.total ?? 0) / 100),
    })
  );
});

// GET /admin/attendees-stats/confirmed-breakdown — the "what actually makes
// up the confirmed list" view requested for the Confirmed Attendees screen.
// Every count below is scoped to type:'attendee', status:'confirmed' only —
// this deliberately answers "of everyone already confirmed, how did they get
// there" rather than re-describing the whole attendee funnel (that's
// analytics.controller.ts's registrations() tab already). Same flat
// Promise.all-of-aggregates shape as that file, not $facet, for consistency.
export const adminConfirmedBreakdown = catchAsync(async (_req: Request, res: Response) => {
  const match = { type: 'attendee', status: 'confirmed' } as const;

  const [
    byTicketCategoryRaw,
    byDiscountTierRaw,
    byPaymentStatusRaw,
    byPaymentMethodRaw,
    byRegistrationModeRaw,
    byCheckInRaw,
    confirmedByDayRaw,
    seatsAgg,
  ] = await Promise.all([
    Registration.aggregate<{ _id: string; count: number; revenueKobo: number }>([
      { $match: match },
      { $group: { _id: '$ticketCategory', count: { $sum: 1 }, revenueKobo: { $sum: '$amountKobo' } } },
      { $sort: { count: -1 } },
    ]),
    // Bucketed on discountPercent as stored — 0/missing means "no discount,
    // paid full price". 10% is the group-registration tier; 25/50/100 are
    // scholarship tiers (see AccessCode.model.ts's ACCESS_CODE_DISCOUNTS).
    Registration.aggregate<{ _id: number; count: number }>([
      { $match: match },
      { $group: { _id: { $ifNull: ['$discountPercent', 0] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    ]),
    // Only ever set when paymentStatus is 'paid' (a free/not_required
    // confirmation never touches Paystack or a manual mark-paid action).
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { ...match, paymentMethod: { $exists: true } } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]),
    // "seats" counts actual headcount (self + every group member) per
    // registration record, not just the record itself — a single group
    // registration can represent many real attendees.
    Registration.aggregate<{ _id: string; records: number; seats: number }>([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$registrationMode', 'individual'] },
          records: { $sum: 1 },
          seats: { $sum: { $add: [1, { $size: { $ifNull: ['$groupAttendees', []] } }] } },
        },
      },
    ]),
    Registration.aggregate<{ _id: boolean; count: number }>([
      { $match: match },
      { $group: { _id: '$checkedIn', count: { $sum: 1 } } },
    ]),
    // No dedicated "confirmedAt" timestamp exists on this model — updatedAt is
    // the best available proxy (a pending->confirmed transition, whether via
    // Paystack webhook or an admin action, always touches it) and is the same
    // proxy this app already leans on elsewhere for "when did this change".
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { ...match, updatedAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: { $add: [1, { $size: { $ifNull: ['$groupAttendees', []] } }] } } } },
    ]),
  ]);

  const byTicketCategory = TICKET_CATEGORIES.map((category) => {
    const row = byTicketCategoryRaw.find((r) => r._id === category);
    return { category, count: row?.count ?? 0, revenueNaira: koboToNaira(row?.revenueKobo ?? 0) };
  }).filter((r) => r.count > 0);

  const byDiscountTier = [0, ...ACCESS_CODE_DISCOUNTS].map((tier) => ({
    tier,
    label: tier === 0 ? 'Full price' : tier === 10 ? '10% (group)' : `${tier}% (scholarship)`,
    count: byDiscountTierRaw.find((r) => r._id === tier)?.count ?? 0,
  }));

  const byPaymentMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0])) as Record<string, number>;
  byPaymentMethodRaw.forEach((r) => (byPaymentMethod[r._id] = r.count));

  const records = byRegistrationModeRaw.reduce((sum, r) => sum + r.records, 0);
  const seats = seatsAgg[0]?.total ?? 0;

  res.json(
    new ApiResponse({
      records,
      seats,
      byTicketCategory,
      byDiscountTier,
      byPaymentStatus: Object.fromEntries(byPaymentStatusRaw.map((r) => [r._id, r.count])),
      byPaymentMethod,
      byRegistrationMode: {
        individual: byRegistrationModeRaw.find((r) => r._id === 'individual')?.records ?? 0,
        group: byRegistrationModeRaw.find((r) => r._id === 'group')?.records ?? 0,
        groupSeats: byRegistrationModeRaw.find((r) => r._id === 'group')?.seats ?? 0,
      },
      byCheckIn: {
        checkedIn: byCheckInRaw.find((r) => r._id === true)?.count ?? 0,
        notCheckedIn: byCheckInRaw.find((r) => r._id !== true)?.count ?? 0,
      },
      confirmedByDay: confirmedByDayRaw.map((r) => ({ date: r._id, count: r.count })),
    })
  );
});
