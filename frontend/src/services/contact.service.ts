import { api } from './api';

export const CONTACT_CATEGORIES = ['General', 'Press', 'Partnership', 'Protocol'] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface ContactMessagePayload {
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
}

export const submitContactMessage = async (payload: ContactMessagePayload): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/contact', payload);
  return res.data.data.message;
};
