import { api } from './api';

export type WhatsAppState = 'menu' | 'awaiting_registration_email' | 'awaiting_feedback' | 'handed_off';

export interface WhatsAppMessage {
  direction: 'in' | 'out';
  body: string;
  at: string;
}

export interface WhatsAppRegistrationRef {
  _id: string;
  fullName?: string;
  contactName?: string;
  email?: string;
  contactEmail?: string;
}

export interface WhatsAppConversation {
  _id: string;
  phone: string;
  state: WhatsAppState;
  handoffRequested: boolean;
  handoffAt?: string;
  lastMessageAt?: string;
  registration?: WhatsAppRegistrationRef | null;
  messages: WhatsAppMessage[];
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListWhatsAppConversations = async (params: { q?: string; page?: number; limit?: number }): Promise<Paginated<WhatsAppConversation>> => {
  const res = await api.get<{ success: true; data: WhatsAppConversation[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/whatsapp/conversations',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminGetWhatsAppConversation = async (id: string): Promise<WhatsAppConversation> => {
  const res = await api.get<{ success: true; data: WhatsAppConversation }>(`/admin/whatsapp/conversations/${id}`);
  return res.data.data;
};

export const adminReplyWhatsAppConversation = async (id: string, body: string): Promise<WhatsAppConversation> => {
  const res = await api.post<{ success: true; data: WhatsAppConversation }>(`/admin/whatsapp/conversations/${id}/reply`, { body });
  return res.data.data;
};
