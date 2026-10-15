import { api } from './api';

// Every field here except showcaseCard is already safe for public display
// (see backend InnovationShowcaseEntry.model.ts's header comment) —
// showcaseCard carries a real contact email, so it's the one field the
// public list() endpoint explicitly strips, same split as ConfirmedAbstract's
// internalNotes/presentingCard.presenterEmail.
export interface InnovationShowcaseEntry {
  _id: string;
  startupName: string;
  founderNames?: string;
  country?: string;
  yearFounded?: string;
  website?: string;
  socialMedia?: string;
  logoUrl?: string;
  description?: string;
  solutionName?: string;
  solutionDescription?: string;
  problemAddressed?: string;
  aiTechnologies?: string;
  category?: string;
  trl?: string;
  stageOfDevelopment?: string;
  hasCustomers?: string;
  evidenceOfImpact?: string;
  demoHighlight?: string;
  uniqueValue?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  // Admin-only — excluded entirely from the public list() endpoint (see
  // backend model comment), so this is undefined on anything the public
  // /innovation-showcase/confirmed page ever reads.
  showcaseCard?: { contactEmail?: string; emailSentAt?: string };
}

export interface InnovationShowcaseEntryInput {
  startupName: string;
  founderNames?: string;
  country?: string;
  yearFounded?: string;
  website?: string;
  socialMedia?: string;
  logoUrl?: string;
  description?: string;
  solutionName?: string;
  solutionDescription?: string;
  problemAddressed?: string;
  aiTechnologies?: string;
  category?: string;
  trl?: string;
  stageOfDevelopment?: string;
  hasCustomers?: string;
  evidenceOfImpact?: string;
  demoHighlight?: string;
  uniqueValue?: string;
  order?: number;
  isPublished?: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Public — published only
export const listInnovationShowcaseEntries = async (params?: {
  category?: string;
}): Promise<InnovationShowcaseEntry[]> => {
  const res = await api.get<{ success: true; data: InnovationShowcaseEntry[] }>('/innovation-showcase-entries', {
    params,
  });
  return res.data.data;
};

export const adminListInnovationShowcaseEntries = async (params: {
  category?: string;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<InnovationShowcaseEntry>> => {
  const res = await api.get<{
    success: true;
    data: InnovationShowcaseEntry[];
    meta: Omit<Paginated<never>, 'items'>;
  }>('/admin/innovation-showcase-entries', { params });
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateInnovationShowcaseEntry = async (
  input: InnovationShowcaseEntryInput
): Promise<InnovationShowcaseEntry> => {
  const res = await api.post<{ success: true; data: InnovationShowcaseEntry }>(
    '/admin/innovation-showcase-entries',
    input
  );
  return res.data.data;
};

export const adminUpdateInnovationShowcaseEntry = async (
  id: string,
  input: Partial<InnovationShowcaseEntryInput>
): Promise<InnovationShowcaseEntry> => {
  const res = await api.patch<{ success: true; data: InnovationShowcaseEntry }>(
    `/admin/innovation-showcase-entries/${id}`,
    input
  );
  return res.data.data;
};

export const adminDeleteInnovationShowcaseEntry = async (id: string): Promise<void> => {
  await api.delete(`/admin/innovation-showcase-entries/${id}`);
};

// --- "I'm showcasing" DP card ---

export const adminSetShowcaseCardEmail = async (
  id: string,
  contactEmail: string | null
): Promise<InnovationShowcaseEntry> => {
  const res = await api.patch<{ success: true; data: InnovationShowcaseEntry }>(
    `/admin/innovation-showcase-entries/${id}/showcase-card`,
    { contactEmail }
  );
  return res.data.data;
};

export interface ShowcaseCardEmailMatchResult {
  filled: { startupName: string; contactEmail: string }[];
  alreadySet: { startupName: string; existingEmail: string }[];
  noMatch: { companyName: string }[];
}

// Fills showcaseCard.contactEmail from confirmed Innovator registrations,
// matched by company/startup name — never overwrites an email that's
// already set. Safe to re-run anytime (e.g. after more Innovator access
// codes get redeemed) — nothing here is destructive.
export const adminMatchShowcaseCardEmails = async (): Promise<ShowcaseCardEmailMatchResult> => {
  const res = await api.post<{ success: true; data: ShowcaseCardEmailMatchResult }>(
    '/admin/innovation-showcase-entries/card/match-emails'
  );
  return res.data.data;
};

// ids omitted -> every record with a contact email on file. `skipped` is how
// many candidates had no email (never attempted, not a send failure).
export const adminSendShowcaseCardInvites = async (
  ids?: string[]
): Promise<{ targeted: number; sent: number; failed: number; skipped: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number; skipped: number } }>(
    '/admin/innovation-showcase-entries/card/send-invites',
    { ids }
  );
  return res.data.data;
};

export interface ShowcaseCardData {
  startupName: string;
  founderNames: string | null;
  logoUrl: string | null;
  solutionName: string | null;
  category: string | null;
}

// Public — GET /innovation-showcase-entries/showcase/:token, no auth.
export const fetchShowcaseCard = async (token: string): Promise<ShowcaseCardData> => {
  const res = await api.get<{ success: true; data: ShowcaseCardData }>(`/innovation-showcase-entries/showcase/${token}`);
  return res.data.data;
};
