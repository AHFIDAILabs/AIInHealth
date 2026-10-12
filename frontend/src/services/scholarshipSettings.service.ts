import { api } from './api';

export interface ScholarshipApplicationsStatus {
  open: boolean;
  reason?: string;
}

export const fetchScholarshipApplicationsStatus = async (): Promise<ScholarshipApplicationsStatus> => {
  const res = await api.get<{ success: true; data: ScholarshipApplicationsStatus }>('/scholarship-applications/applications-status');
  return res.data.data;
};

export interface AdminScholarshipSettings {
  open: boolean;
  reason?: string;
  closedAt?: string;
}

export const fetchAdminScholarshipSettings = async (): Promise<AdminScholarshipSettings> => {
  const res = await api.get<{ success: true; data: AdminScholarshipSettings }>('/admin/scholarship-settings');
  return res.data.data;
};

export const setScholarshipApplicationsOpen = async (open: boolean, reason?: string): Promise<AdminScholarshipSettings> => {
  const res = await api.put<{ success: true; data: AdminScholarshipSettings }>('/admin/scholarship-settings', {
    applicationsOpen: open,
    reason,
  });
  return res.data.data;
};
