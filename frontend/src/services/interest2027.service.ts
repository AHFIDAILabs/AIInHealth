import { api } from './api';

// Mirrors backend/src/types/enums.ts's INTEREST_2027_TYPES — "support to
// attend" was deliberately left out after asking the owner (brief section
// 8.3); financial-assistance requests stay the separate Sponsored Delegates
// process, not a checkbox here.
export const INTEREST_2027_TYPES = ['attend', 'speak', 'submit_abstract', 'exhibit', 'sponsor_partner', 'volunteer', 'media'] as const;
export type Interest2027Type = (typeof INTEREST_2027_TYPES)[number];

export const INTEREST_2027_LABELS: Record<Interest2027Type, string> = {
  attend: 'Attend',
  speak: 'Speak at a session',
  submit_abstract: 'Submit an abstract',
  exhibit: 'Exhibit or showcase an innovation',
  sponsor_partner: 'Sponsor or partner with us',
  volunteer: 'Volunteer',
  media: 'Media / press',
};

export interface SubmitInterest2027Input {
  fullName: string;
  email: string;
  phone?: string;
  whatsappOptIn: boolean;
  organisation?: string;
  role?: string;
  country: string;
  interestTypes: Interest2027Type[];
  consentGiven: boolean;
  inviteToken?: string;
  formMeta?: string;
  formToken: string;
}

// Public — the /2027 interest form. Dedup-by-email and interest-merging both
// happen server-side (interest2027.controller.ts); re-submitting just updates
// the existing record.
export const submitInterest2027 = async (input: SubmitInterest2027Input): Promise<void> => {
  await api.post('/2027-interest', input);
};

export interface Interest2027Invite {
  fullName: string | null;
  email: string | null;
}

// Public — only reachable with a real personalised token (see
// Registration.model.ts's interest2027Token). Never called speculatively;
// the anonymous form never exposes or guesses at registration data.
export const fetchInterest2027Invite = async (token: string): Promise<Interest2027Invite> => {
  const res = await api.get<{ success: true; data: Interest2027Invite }>(`/2027-interest/invite/${token}`);
  return res.data.data;
};

export interface AdminInterest2027 {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  whatsappOptIn: boolean;
  organisation?: string;
  role?: string;
  country: string;
  interestTypes: Interest2027Type[];
  consent: { given: boolean; textVersion: string; givenAt: string };
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListInterest2027Params {
  interestType?: Interest2027Type;
  country?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const adminListInterest2027 = async (params: ListInterest2027Params): Promise<Paginated<AdminInterest2027>> => {
  const res = await api.get<{ success: true; data: AdminInterest2027[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/2027-interest',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const exportInterest2027Url = (params: ListInterest2027Params): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/2027-interest/export?${search.toString()}`;
};
