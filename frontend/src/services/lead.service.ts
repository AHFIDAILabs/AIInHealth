import { api } from './api';

export type LeadInterestLevel = 'hot' | 'warm' | 'cold';

export interface Lead {
  _id: string;
  exhibitor: string;
  fullName: string;
  email?: string;
  phone?: string;
  organization?: string;
  interestLevel: LeadInterestLevel;
  notes?: string;
  capturedAt: string;
}

export interface LeadInput {
  fullName: string;
  email?: string;
  phone?: string;
  organization?: string;
  interestLevel?: LeadInterestLevel;
  notes?: string;
}

export const listLeadsForExhibitor = async (exhibitorId: string): Promise<Lead[]> => {
  const res = await api.get<{ success: true; data: Lead[] }>(`/admin/exhibitors/${exhibitorId}/leads`);
  return res.data.data;
};

export const createLead = async (exhibitorId: string, input: LeadInput): Promise<Lead> => {
  const res = await api.post<{ success: true; data: Lead }>(`/admin/exhibitors/${exhibitorId}/leads`, input);
  return res.data.data;
};

export const updateLead = async (id: string, input: Partial<LeadInput>): Promise<Lead> => {
  const res = await api.patch<{ success: true; data: Lead }>(`/admin/leads/${id}`, input);
  return res.data.data;
};

export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`/admin/leads/${id}`);
};
