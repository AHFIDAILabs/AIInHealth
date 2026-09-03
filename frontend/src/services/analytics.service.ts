import { api } from './api';

export interface AnalyticsOverview {
  registrationsByDay: { date: string; count: number }[];
  revenueByDay: { date: string; amountNaira: number }[];
  byCategory: { category: string; count: number; revenueNaira: number }[];
  funnel: { created: number; paid: number; confirmed: number };
  checkInRate: number;
  directoryOptInRate: number;
  checkedInCount: number;
  totalConfirmed: number;
}

export const fetchAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await api.get<{ success: true; data: AnalyticsOverview }>('/admin/analytics');
  return res.data.data;
};
