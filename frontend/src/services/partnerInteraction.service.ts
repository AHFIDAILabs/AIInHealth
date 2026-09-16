import { api } from './api';

export const PARTNER_INTERACTION_TYPES = ['call', 'email', 'meeting', 'note'] as const;
export type PartnerInteractionType = (typeof PARTNER_INTERACTION_TYPES)[number];

export interface AdminPartnerInteraction {
  _id: string;
  partner: { _id: string; name: string };
  type: PartnerInteractionType;
  notes?: string;
  occurredAt: string;
  followUpDueAt?: string;
  followUpCompleted: boolean;
  createdAt: string;
}

export const adminListInteractions = async (): Promise<AdminPartnerInteraction[]> => {
  const res = await api.get<{ success: true; data: AdminPartnerInteraction[] }>('/admin/interactions');
  return res.data.data;
};

export const adminCreateInteraction = async (
  partnerId: string,
  input: { type: PartnerInteractionType; notes?: string; followUpDueAt?: string }
): Promise<AdminPartnerInteraction> => {
  const res = await api.post<{ success: true; data: AdminPartnerInteraction }>(`/admin/partners/${partnerId}/interactions`, input);
  return res.data.data;
};

export const adminMarkFollowUpDone = async (id: string): Promise<AdminPartnerInteraction> => {
  const res = await api.patch<{ success: true; data: AdminPartnerInteraction }>(`/admin/interactions/${id}/follow-up-done`);
  return res.data.data;
};
