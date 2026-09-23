import { api } from './api';

export interface VolunteerApplicationsStatus {
  open: boolean;
  reason?: string;
}

export const fetchVolunteerApplicationsStatus = async (): Promise<VolunteerApplicationsStatus> => {
  const res = await api.get<{ success: true; data: VolunteerApplicationsStatus }>('/volunteers/applications-status');
  return res.data.data;
};

export interface AdminVolunteerSettings {
  open: boolean;
  reason?: string;
  closedAt?: string;
}

export const fetchAdminVolunteerSettings = async (): Promise<AdminVolunteerSettings> => {
  const res = await api.get<{ success: true; data: AdminVolunteerSettings }>('/admin/volunteer-settings');
  return res.data.data;
};

export const setVolunteerApplicationsOpen = async (open: boolean, reason?: string): Promise<AdminVolunteerSettings> => {
  const res = await api.put<{ success: true; data: AdminVolunteerSettings }>('/admin/volunteer-settings', {
    applicationsOpen: open,
    reason,
  });
  return res.data.data;
};
