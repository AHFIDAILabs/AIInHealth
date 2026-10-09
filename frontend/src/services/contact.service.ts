import { api } from './api';

export const CONTACT_CATEGORIES = ['General', 'Press', 'Partnership', 'Protocol'] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface ContactMessagePayload {
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
  // Spam hardening — a real visitor never sees or fills this (HoneypotField);
  // formToken is the time-trap token from useFormToken(). Both optional at
  // this layer — see backend's own graceful-degrade comments. Not named
  // "website" — see registration.service.ts's comment on why a real-sounding
  // honeypot name risks silent autofill poisoning.
  formMeta?: string;
  formToken?: string;
}

export const submitContactMessage = async (payload: ContactMessagePayload): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/contact', payload);
  return res.data.data.message;
};
