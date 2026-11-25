import { api } from './api';

export type ReportAccessAction = 'view' | 'download';

export interface AdminReportAccessEvent {
  _id: string;
  email: string;
  reportId: string;
  sessionTitle: string | null;
  docTypeLabel: string | null;
  action: ReportAccessAction;
  accessedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListReportAccessEventsParams {
  action?: ReportAccessAction;
  reportId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const adminListReportAccessEvents = async (
  params: ListReportAccessEventsParams
): Promise<Paginated<AdminReportAccessEvent>> => {
  const res = await api.get<{ success: true; data: AdminReportAccessEvent[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/reports/events',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const exportReportAccessEventsUrl = (params: ListReportAccessEventsParams): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/reports/events/export?${search.toString()}`;
};

export interface AdminReportAccessStats {
  totalViews: number;
  totalDownloads: number;
  totalAccessCodesIssued: number;
  byReportId: Record<string, { views: number; downloads: number }>;
}

export const adminFetchReportAccessStats = async (): Promise<AdminReportAccessStats> => {
  const res = await api.get<{ success: true; data: AdminReportAccessStats }>('/admin/reports/access-stats');
  return res.data.data;
};
