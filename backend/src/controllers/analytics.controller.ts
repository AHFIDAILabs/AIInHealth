import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';

const DAYS = 30;
const since = () => new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

// GET /admin/analytics — trend, funnel, and category cuts beyond the Dashboard's
// point-in-time totals. All aggregation, no writes.
export const overview = catchAsync(async (_req: Request, res: Response) => {
  const [registrationsByDay, revenueByDay, byCategory, funnel, checkedInCount, directoryOptInCount] = await Promise.all([
    Registration.aggregate([
      { $match: { createdAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amountKobo: { $sum: '$amountKobo' } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate([
      { $match: { type: 'attendee', ticketCategory: { $exists: true } } },
      { $group: { _id: '$ticketCategory', count: { $sum: 1 }, revenueKobo: { $sum: '$amountKobo' } } },
      { $sort: { count: -1 } },
    ]),
    Promise.all([
      Registration.countDocuments({ type: 'attendee' }),
      Registration.countDocuments({ type: 'attendee', paymentStatus: 'paid' }),
      Registration.countDocuments({ type: 'attendee', status: 'confirmed' }),
    ]),
    Registration.countDocuments({ status: 'confirmed', checkedIn: true }),
    Registration.countDocuments({ directoryOptIn: true }),
  ]);

  const [created, paid, confirmed] = funnel;
  const totalConfirmed = await Registration.countDocuments({ status: 'confirmed' });

  res.json(
    new ApiResponse({
      registrationsByDay: registrationsByDay.map((r) => ({ date: r._id, count: r.count })),
      revenueByDay: revenueByDay.map((r) => ({ date: r._id, amountNaira: Math.round(r.amountKobo / 100) })),
      byCategory: byCategory.map((c) => ({ category: c._id, count: c.count, revenueNaira: Math.round((c.revenueKobo ?? 0) / 100) })),
      funnel: { created, paid, confirmed },
      checkInRate: totalConfirmed ? Math.round((checkedInCount / totalConfirmed) * 100) : 0,
      directoryOptInRate: totalConfirmed ? Math.round((directoryOptInCount / totalConfirmed) * 100) : 0,
      checkedInCount,
      totalConfirmed,
    })
  );
});
