import { api } from './api';

export type NewsletterSource = 'updates' | 'concept_note';

// Public — the Home/Footer newsletter signup form.
export const subscribeNewsletter = async (input: { email: string; firstName: string; source: NewsletterSource }): Promise<void> => {
  await api.post('/newsletter/subscribe', input);
};

export interface AdminNewsletterSubscriber {
  _id: string;
  email: string;
  firstName: string;
  source: NewsletterSource;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListNewsletterSubscribersParams {
  source?: NewsletterSource;
  q?: string;
  page?: number;
  limit?: number;
}

export const adminListNewsletterSubscribers = async (
  params: ListNewsletterSubscribersParams
): Promise<Paginated<AdminNewsletterSubscriber>> => {
  const res = await api.get<{ success: true; data: AdminNewsletterSubscriber[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/newsletter-subscribers',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const exportNewsletterSubscribersUrl = (params: ListNewsletterSubscribersParams): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/newsletter-subscribers/export?${search.toString()}`;
};
