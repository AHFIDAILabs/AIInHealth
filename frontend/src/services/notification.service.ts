import { api } from './api';
import type { NotificationEvent } from './auth.service';

export interface AdminNotification {
  id: string;
  type: NotificationEvent;
  title: string;
  body?: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  isRead: boolean;
}

export const listNotifications = async (): Promise<{ items: AdminNotification[]; unreadCount: number }> => {
  const res = await api.get<{ success: true; data: AdminNotification[]; meta: { unreadCount: number } }>('/admin/notifications');
  return { items: res.data.data, unreadCount: res.data.meta.unreadCount };
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/admin/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/admin/notifications/read-all');
};
