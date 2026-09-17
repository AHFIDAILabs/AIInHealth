import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';

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
