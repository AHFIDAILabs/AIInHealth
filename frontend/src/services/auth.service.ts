import { api } from './api';

export const ROLES = ['super_admin', 'content_editor', 'registrations_officer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const NOTIFICATION_EVENTS = [
  'registration.new',
  'inquiry.new',
  'message.new',
  'newsletter.new',
  'abstract.reviewer_declined',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export interface NotificationPrefs {
  emailDigest: boolean;
  pushEnabled: boolean;
  events: NotificationEvent[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  notificationPrefs?: NotificationPrefs;
}

export const login = async (email: string, password: string): Promise<AdminUser> => {
  const res = await api.post<{ success: true; data: { user: AdminUser } }>('/auth/login', { email, password });
  return res.data.data.user;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const fetchMe = async (): Promise<AdminUser> => {
  const res = await api.get<{ success: true; data: AdminUser }>('/auth/me');
  return res.data.data;
};

export const forgotPassword = async (email: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/auth/forgot-password', { email });
  return res.data.data.message;
};

export const resetPassword = async (token: string, newPassword: string, confirmPassword: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/auth/reset-password', {
    token,
    newPassword,
    confirmPassword,
  });
  return res.data.data.message;
};

export const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  });
  return res.data.data.message;
};

export const updateProfile = async (input: { fullName?: string; avatarUrl?: string }): Promise<AdminUser> => {
  const res = await api.patch<{ success: true; data: AdminUser }>('/auth/profile', input);
  return res.data.data;
};

export const updateNotificationPrefs = async (prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
  const res = await api.patch<{ success: true; data: NotificationPrefs }>('/auth/notification-prefs', prefs);
  return res.data.data;
};
