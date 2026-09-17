import { api } from './api';

export interface ExhibitorStats {
  totalExhibitors: number;
  activeExhibitors: number;
  totalLeadsCaptured: number;
  hotLeads: number;
}

export interface ExhibitorAnalytics {
  topExhibitorsByLeads: { exhibitorName: string; leadCount: number }[];
  leadsByInterestLevel: Record<string, number>;
}

export interface ExhibitorImportReport {
  totalRows: number;
  inserted: { companyName: string; contactEmail: string }[];
  skippedDuplicates: { row: number; contactEmail: string }[];
  validationFailures: { row: number; error: string }[];
}

export const fetchExhibitorStats = async (): Promise<ExhibitorStats> => {
  const res = await api.get<{ success: true; data: ExhibitorStats }>('/admin/exhibitors-stats');
  return res.data.data;
};

export const fetchExhibitorAnalytics = async (): Promise<ExhibitorAnalytics> => {
  const res = await api.get<{ success: true; data: ExhibitorAnalytics }>('/admin/exhibitors-analytics');
  return res.data.data;
};

export const importExhibitorsCsv = async (file: File): Promise<ExhibitorImportReport> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ success: true; data: ExhibitorImportReport }>('/admin/exhibitors/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};
