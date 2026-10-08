import { api } from './api';

export interface InnovatorApplicationsStatus {
  open: boolean;
  reason?: string;
}

export const fetchInnovatorApplicationsStatus = async (): Promise<InnovatorApplicationsStatus> => {
  const res = await api.get<{ success: true; data: InnovatorApplicationsStatus }>('/innovator/applications-status');
  return res.data.data;
};

export interface AdminInnovatorSettings {
  open: boolean;
  reason?: string;
  closedAt?: string;
}

export const fetchAdminInnovatorSettings = async (): Promise<AdminInnovatorSettings> => {
  const res = await api.get<{ success: true; data: AdminInnovatorSettings }>('/admin/innovator-settings');
  return res.data.data;
};

export const setInnovatorApplicationsOpen = async (open: boolean, reason?: string): Promise<AdminInnovatorSettings> => {
  const res = await api.put<{ success: true; data: AdminInnovatorSettings }>('/admin/innovator-settings', {
    applicationsOpen: open,
    reason,
  });
  return res.data.data;
};
