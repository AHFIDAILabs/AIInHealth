import { api } from './api';

export interface AnalyticsOverview {
  totalRegistrations: number;
  checkInRate: number;
  totalRevenueNaira: number;
  sponsorRevenueNaira: number;
  combinedRevenueNaira: number;
  abstractsAccepted: number;
  abstractsTotal: number;
  exhibitorsCount: number;
  activeVolunteers: number;
  totalVolunteers: number;
  emailsSent: number;
  registrationsByDay: { date: string; count: number }[];
  // Kept for DashboardPage.tsx's landing-page KPI sparkline/delta — the
  // Analytics page's own Overview tab doesn't otherwise use these two.
  revenueByDay: { date: string; amountNaira: number }[];
  checkedInCount: number;
  totalConfirmed: number;
  sponsorRevenueByPackage: { packageName: string; revenueNaira: number }[];
}

export const fetchAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await api.get<{ success: true; data: AnalyticsOverview }>('/admin/analytics');
  return res.data.data;
};

export interface AnalyticsRegistrations {
  registrationsByDay: { date: string; count: number }[];
  checkInsByDay: { date: string; count: number }[];
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTicketType: { category: string; count: number; revenueNaira: number }[];
  byPaymentStatus: Record<string, number>;
  funnel: { created: number; paid: number; confirmed: number };
  directoryOptInRate: number;
}

export const fetchAnalyticsRegistrations = async (): Promise<AnalyticsRegistrations> => {
  const res = await api.get<{ success: true; data: AnalyticsRegistrations }>('/admin/analytics-registrations');
  return res.data.data;
};

export interface AnalyticsRevenue {
  totalRegistrationRevenueNaira: number;
  totalSponsorRevenueNaira: number;
  combinedRevenueNaira: number;
  sponsorRevenueByPackage: { packageName: string; revenueNaira: number }[];
  registrationRevenueByTicket: { category: string; revenueNaira: number }[];
  topSponsors: { name: string; packageName: string; amountPaidNaira: number }[];
}

export const fetchAnalyticsRevenue = async (): Promise<AnalyticsRevenue> => {
  const res = await api.get<{ success: true; data: AnalyticsRevenue }>('/admin/analytics-revenue');
  return res.data.data;
};

export interface AnalyticsEngagement {
  emailPipeline: { draft: number; sent: number; failed: number; cancelled: number };
  emailsSent: number;
  newsletterSubscribers: number;
  abstractsByStatus: Record<string, number>;
  abstractsByTrack: Record<string, number>;
}

export const fetchAnalyticsEngagement = async (): Promise<AnalyticsEngagement> => {
  const res = await api.get<{ success: true; data: AnalyticsEngagement }>('/admin/analytics-engagement');
  return res.data.data;
};
