import { api } from './api';

export interface AdminDeliverable {
  _id: string;
  partner: { _id: string; name: string };
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
  completedAt?: string;
  createdAt: string;
}

export const adminListDeliverables = async (): Promise<AdminDeliverable[]> => {
  const res = await api.get<{ success: true; data: AdminDeliverable[] }>('/admin/deliverables');
  return res.data.data;
};

export const adminCreateDeliverable = async (
  partnerId: string,
  input: { description: string; dueDate: string }
): Promise<AdminDeliverable> => {
  const res = await api.post<{ success: true; data: AdminDeliverable }>(`/admin/partners/${partnerId}/deliverables`, input);
  return res.data.data;
};

export const adminUpdateDeliverable = async (
  id: string,
  input: { description?: string; dueDate?: string; status?: 'pending' | 'completed' }
): Promise<AdminDeliverable> => {
  const res = await api.patch<{ success: true; data: AdminDeliverable }>(`/admin/deliverables/${id}`, input);
  return res.data.data;
};

export const adminDeleteDeliverable = async (id: string): Promise<void> => {
  await api.delete(`/admin/deliverables/${id}`);
};
