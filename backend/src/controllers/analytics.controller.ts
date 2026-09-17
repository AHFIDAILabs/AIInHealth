import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import { Partner } from '../models/Partner.model.js';
import { Abstract } from '../models/Abstract.model.js';
import { AbstractCommunication } from '../models/AbstractCommunication.model.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model.js';
import { REGISTRATION_STATUSES, REGISTRATION_TYPES, PAYMENT_STATUSES, ABSTRACT_STATUSES, TRACKS } from '../types/enums.js';

const DAYS = 30;
const since = () => new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

const koboToNaira = (kobo: number): number => Math.round(kobo / 100);

// Every number below is a real query against the live collections — no
// placeholder/invented figures (same rule this app already holds itself to
// in admin.controller.ts's dashboardStats). Where this event genuinely has
// no data yet for something (e.g. no one has checked in before doors open),
// that renders as an honest empty/zero state on the frontend rather than a
// fabricated number.

// GET /admin/analytics — top-line, all-time totals for the Overview tab, plus
// the two trend charts it shows (registrations by day, sponsor revenue by
// package). Tab-specific detail (registration breakdowns, revenue detail,
// engagement) lives in the three sibling endpoints below.
export const overview = catchAsync(async (_req: Request, res: Response) => {
  const [
    totalRegistrations,
    checkedInCount,
    totalConfirmed,
    ticketRevenueAgg,
    sponsorRevenueAgg,
    sponsorRevenueByPackageRaw,
    abstractsAccepted,
    abstractsTotal,
    exhibitorsCount,
    activeVolunteers,
    totalVolunteers,
    emailsSent,
    registrationsByDay,
    revenueByDay,
  ] = await Promise.all([
    Registration.countDocuments(),
    Registration.countDocuments({ status: 'confirmed', checkedIn: true }),
    Registration.countDocuments({ status: 'confirmed' }),
    Registration.aggregate<{ total: number }>([
      { $match: { type: 'attendee', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amountKobo' } } },
    ]),
    Partner.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$amountPaidKobo' } } }]),
    Partner.aggregate<{ _id: string | null; total: number }>([
      { $match: { amountPaidKobo: { $gt: 0 } } },
      { $group: { _id: '$package', total: { $sum: '$amountPaidKobo' } } },
      {
        $lookup: { from: 'sponsorshippackages', localField: '_id', foreignField: '_id', as: 'pkg' },
      },
    ]),
    Abstract.countDocuments({ status: 'accepted' }),
    Abstract.countDocuments(),
    Registration.countDocuments({ type: 'exhibitor' }),
    Registration.countDocuments({ type: 'volunteer', status: 'confirmed' }),
    Registration.countDocuments({ type: 'volunteer' }),
    AbstractCommunication.countDocuments({ status: 'sent' }),
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Kept here (not just in the Revenue tab's own endpoint) — DashboardPage.tsx's
    // landing-page KPI sparkline/delta reads this same field off this endpoint.
    Registration.aggregate<{ _id: string; amountKobo: number }>([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amountKobo: { $sum: '$amountKobo' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalRevenueNaira = koboToNaira(ticketRevenueAgg[0]?.total ?? 0);
  const sponsorRevenueNaira = koboToNaira(sponsorRevenueAgg[0]?.total ?? 0);

  const sponsorRevenueByPackage = sponsorRevenueByPackageRaw.map((row) => ({
    packageName: (row as unknown as { pkg: { name: string }[] }).pkg[0]?.name ?? 'No Package',
    revenueNaira: koboToNaira(row.total),
  }));

  res.json(
    new ApiResponse({
      totalRegistrations,
      checkInRate: totalConfirmed ? Math.round((checkedInCount / totalConfirmed) * 100) : 0,
      totalRevenueNaira,
      sponsorRevenueNaira,
      combinedRevenueNaira: totalRevenueNaira + sponsorRevenueNaira,
      abstractsAccepted,
      abstractsTotal,
      exhibitorsCount,
      activeVolunteers,
      totalVolunteers,
      emailsSent,
      registrationsByDay: registrationsByDay.map((r) => ({ date: r._id, count: r.count })),
      revenueByDay: revenueByDay.map((r) => ({ date: r._id, amountNaira: koboToNaira(r.amountKobo) })),
      checkedInCount,
      totalConfirmed,
      sponsorRevenueByPackage,
    })
  );
});

// GET /admin/analytics-registrations
export const registrations = catchAsync(async (_req: Request, res: Response) => {
  const [
    registrationsByDay,
    checkInsByDayRaw,
    byStatusRaw,
    byTypeRaw,
    byTicketTypeRaw,
    byPaymentStatusRaw,
    created,
    paid,
    confirmed,
    directoryOptInCount,
    totalConfirmed,
  ] = await Promise.all([
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { checkedIn: true, checkedInAt: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkedInAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Registration.aggregate<{ _id: string; count: number; revenueKobo: number }>([
      { $match: { type: 'attendee', ticketCategory: { $exists: true } } },
      { $group: { _id: '$ticketCategory', count: { $sum: 1 }, revenueKobo: { $sum: '$amountKobo' } } },
      { $sort: { count: -1 } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
    Registration.countDocuments({ type: 'attendee' }),
    Registration.countDocuments({ type: 'attendee', paymentStatus: 'paid' }),
    Registration.countDocuments({ type: 'attendee', status: 'confirmed' }),
    Registration.countDocuments({ directoryOptIn: true }),
    Registration.countDocuments({ status: 'confirmed' }),
  ]);

  const byStatus = Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  byStatusRaw.forEach((r) => (byStatus[r._id] = r.count));

  const byType = Object.fromEntries(REGISTRATION_TYPES.map((t) => [t, 0])) as Record<string, number>;
  byTypeRaw.forEach((r) => (byType[r._id] = r.count));

  const byPaymentStatus = Object.fromEntries(PAYMENT_STATUSES.map((p) => [p, 0])) as Record<string, number>;
  byPaymentStatusRaw.forEach((r) => (byPaymentStatus[r._id] = r.count));

  res.json(
    new ApiResponse({
      registrationsByDay: registrationsByDay.map((r) => ({ date: r._id, count: r.count })),
      checkInsByDay: checkInsByDayRaw.map((r) => ({ date: r._id, count: r.count })),
      byStatus,
      byType,
      byTicketType: byTicketTypeRaw.map((c) => ({ category: c._id, count: c.count, revenueNaira: koboToNaira(c.revenueKobo ?? 0) })),
      byPaymentStatus,
      funnel: { created, paid, confirmed },
      directoryOptInRate: totalConfirmed ? Math.round((directoryOptInCount / totalConfirmed) * 100) : 0,
    })
  );
});

// GET /admin/analytics-revenue
export const revenue = catchAsync(async (_req: Request, res: Response) => {
  const [ticketRevenueAgg, byTicketTypeRaw, sponsorRevenueByPackageRaw, topSponsorsRaw] = await Promise.all([
    Registration.aggregate<{ total: number }>([
      { $match: { type: 'attendee', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amountKobo' } } },
    ]),
    Registration.aggregate<{ _id: string; revenueKobo: number }>([
      { $match: { type: 'attendee', ticketCategory: { $exists: true } } },
      { $group: { _id: '$ticketCategory', revenueKobo: { $sum: '$amountKobo' } } },
      { $sort: { revenueKobo: -1 } },
    ]),
    Partner.aggregate<{ _id: string | null; total: number }>([
      { $match: { amountPaidKobo: { $gt: 0 } } },
      { $group: { _id: '$package', total: { $sum: '$amountPaidKobo' } } },
      { $lookup: { from: 'sponsorshippackages', localField: '_id', foreignField: '_id', as: 'pkg' } },
    ]),
    Partner.find()
      .populate('package', 'name')
      .sort({ amountPaidKobo: -1 })
      .limit(10)
      .select('name package amountPaidKobo')
      .lean(),
  ]);

  const totalRegistrationRevenueNaira = koboToNaira(ticketRevenueAgg[0]?.total ?? 0);
  const sponsorRevenueByPackage = sponsorRevenueByPackageRaw.map((row) => ({
    packageName: (row as unknown as { pkg: { name: string }[] }).pkg[0]?.name ?? 'No Package',
    revenueNaira: koboToNaira(row.total),
  }));
  const totalSponsorRevenueNaira = sponsorRevenueByPackage.reduce((sum, p) => sum + p.revenueNaira, 0);

  res.json(
    new ApiResponse({
      totalRegistrationRevenueNaira,
      totalSponsorRevenueNaira,
      combinedRevenueNaira: totalRegistrationRevenueNaira + totalSponsorRevenueNaira,
      sponsorRevenueByPackage,
      registrationRevenueByTicket: byTicketTypeRaw.map((c) => ({ category: c._id, revenueNaira: koboToNaira(c.revenueKobo ?? 0) })),
      topSponsors: topSponsorsRaw.map((p) => ({
        name: p.name,
        packageName: (p.package as unknown as { name: string } | null)?.name ?? 'None',
        amountPaidNaira: koboToNaira(p.amountPaidKobo ?? 0),
      })),
    })
  );
});

// GET /admin/analytics-engagement — real numbers only. No email open/click
// rate here: Microsoft Graph's sendMail (this app's email provider) has no
// built-in tracking for that, and this app never displays an invented
// number where a real one isn't available — see the "no invented numbers"
// rule referenced in admin.controller.ts. What IS real and shown instead:
// how many decision emails actually sent/failed, and newsletter growth.
export const engagement = catchAsync(async (_req: Request, res: Response) => {
  const [communications, newsletterSubscribers, abstracts] = await Promise.all([
    AbstractCommunication.find().select('status').lean(),
    NewsletterSubscriber.countDocuments(),
    Abstract.find().select('status track').lean(),
  ]);

  const emailPipeline = { draft: 0, sent: 0, failed: 0, cancelled: 0 };
  for (const c of communications) {
    if (c.status in emailPipeline) emailPipeline[c.status as keyof typeof emailPipeline] += 1;
  }

  const abstractsByStatus = Object.fromEntries(ABSTRACT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const abstractsByTrack = Object.fromEntries(TRACKS.map((t) => [t, 0])) as Record<string, number>;
  for (const a of abstracts) {
    abstractsByStatus[a.status] = (abstractsByStatus[a.status] ?? 0) + 1;
    abstractsByTrack[a.track] = (abstractsByTrack[a.track] ?? 0) + 1;
  }

  res.json(
    new ApiResponse({
      emailPipeline,
      emailsSent: emailPipeline.sent,
      newsletterSubscribers,
      abstractsByStatus,
      abstractsByTrack,
    })
  );
});
