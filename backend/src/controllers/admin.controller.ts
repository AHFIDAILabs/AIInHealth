import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Session } from '../models/Session.model.js';
import { Partner } from '../models/Partner.model.js';
import { Innovation } from '../models/Innovation.model.js';
import { Abstract } from '../models/Abstract.model.js';
import { PartnershipInquiry } from '../models/PartnershipInquiry.model.js';
import { ContactMessage } from '../models/ContactMessage.model.js';
import { EventTeamMember } from '../models/EventTeamMember.model.js';
import { REGISTRATION_STATUSES, REGISTRATION_TYPES } from '../types/enums.js';

// One shared endpoint, all four roles call it — the frontend picks which slice of
// this to show per role, so every count that ANY role's dashboard might need lives
// here rather than four bespoke endpoints. Every number is a real query, nothing
// invented (see the System Design Document's "no invented numbers" rule).
export const dashboardStats = catchAsync(async (_req: Request, res: Response) => {
  const [
    statusCounts,
    typeCounts,
    total,
    recent,
    speakerTotal,
    speakerPublished,
    sessionTotal,
    sessionPublished,
    partnerTotal,
    partnerPublished,
    innovationTotal,
    innovationPublished,
    abstractTotal,
    abstractPending,
    pendingInquiries,
    unreadMessages,
    pendingReview,
    unpaidRegistrations,
    activeTeamMembers,
  ] = await Promise.all([
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Registration.countDocuments(),
    Registration.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('type status createdAt fullName companyName'),
    Speaker.countDocuments(),
    Speaker.countDocuments({ isPublished: true }),
    Session.countDocuments(),
    Session.countDocuments({ isPublished: true }),
    Partner.countDocuments(),
    Partner.countDocuments({ isPublished: true }),
    Innovation.countDocuments(),
    Innovation.countDocuments({ isPublished: true }),
    Abstract.countDocuments(),
    Abstract.countDocuments({ status: 'pending' }),
    PartnershipInquiry.countDocuments({ status: 'New' }),
    ContactMessage.countDocuments({ isRead: false }),
    Registration.countDocuments({ status: 'pending' }),
    Registration.countDocuments({ paymentStatus: 'unpaid' }),
    EventTeamMember.countDocuments({ isActive: true }),
  ]);

  const byStatus = Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  statusCounts.forEach((row) => {
    byStatus[row._id] = row.count;
  });

  const byType = Object.fromEntries(REGISTRATION_TYPES.map((t) => [t, 0])) as Record<string, number>;
  typeCounts.forEach((row) => {
    byType[row._id] = row.count;
  });

  const recentActivity = recent.map((r) => ({
    id: r.id as string,
    type: r.type,
    status: r.status,
    label: r.fullName || r.companyName || 'Unnamed submission',
    createdAt: r.createdAt,
  }));

  res.json(
    new ApiResponse({
      registrations: { total, byStatus, byType },
      content: {
        speakers: { total: speakerTotal, published: speakerPublished },
        sessions: { total: sessionTotal, published: sessionPublished },
        partners: { total: partnerTotal, published: partnerPublished },
        innovations: { total: innovationTotal, published: innovationPublished },
        abstracts: { total: abstractTotal, pending: abstractPending },
      },
      communication: { pendingInquiries, unreadMessages },
      registrationsQueue: { pendingReview, unpaid: unpaidRegistrations },
      team: { activeMembers: activeTeamMembers },
      recentActivity,
    })
  );
});
