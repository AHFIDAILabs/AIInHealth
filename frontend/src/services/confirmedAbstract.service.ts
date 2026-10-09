import { api } from './api';

// Kept in sync with backend/src/types/enums.ts's PRESENTATION_TYPES.
export const PRESENTATION_TYPES = ['oral', 'poster'] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

// Kept in sync with backend/src/types/enums.ts's COMPENDIUM_* enums.
export const COMPENDIUM_PUBLICATION_STATUSES = ['none', 'draft', 'ready', 'published', 'withdrawn'] as const;
export type CompendiumPublicationStatus = (typeof COMPENDIUM_PUBLICATION_STATUSES)[number];

export const COMPENDIUM_CONSENT_METHODS = ['submission_terms', 'email', 'form', 'other'] as const;
export type CompendiumConsentMethod = (typeof COMPENDIUM_CONSENT_METHODS)[number];

export interface CompendiumAuthor {
  name: string;
  affiliation?: string;
  isCorresponding?: boolean;
  orcid?: string;
}

export interface CompendiumConsent {
  granted: boolean;
  grantedAt?: string;
  method?: CompendiumConsentMethod;
  evidenceNote?: string;
  recordedBy?: string;
}

export interface CompendiumCorrection {
  date: string;
  note: string;
  recordedBy?: string;
}

export interface CompendiumFields {
  consentToPublish?: CompendiumConsent;
  publicationStatus: CompendiumPublicationStatus;
  corrections?: CompendiumCorrection[];
  publishedInVersion?: string;
}

// The public-safe subset — no email/phone/visa-or-funding-ask fields exist
// on this model at all (see backend ConfirmedAbstract.model.ts), so there is
// nothing further to strip here the way admin-only fields are stripped
// elsewhere.
export interface ConfirmedAbstract {
  _id: string;
  code: string;
  authorName: string;
  photoUrl?: string;
  title: string;
  presentationType?: PresentationType;
  track?: string;
  country?: string;
  order: number;
}

// Admin view adds the publish flag, the admin-only internal notes field, and
// the additive open-access compendium fields (see Phase 3/4 of the
// compendium project — abstractText/authors/keywords never existed on legacy
// records until the import script backfilled them).
export interface AdminConfirmedAbstract extends ConfirmedAbstract {
  isPublished: boolean;
  internalNotes?: string;
  createdAt: string;
  abstractText?: string;
  authors?: CompendiumAuthor[];
  keywords?: string[];
  language?: string;
  compendium?: CompendiumFields;
}

export interface ConfirmedAbstractInput {
  code: string;
  authorName: string;
  photoUrl?: string;
  title: string;
  presentationType?: PresentationType;
  track?: string;
  country?: string;
  order?: number;
  isPublished?: boolean;
  internalNotes?: string;
  abstractText?: string;
  authors?: CompendiumAuthor[];
  keywords?: string[];
  language?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Public — published only
export const listConfirmedAbstracts = async (params?: { track?: string }): Promise<ConfirmedAbstract[]> => {
  const res = await api.get<{ success: true; data: ConfirmedAbstract[] }>('/confirmed-abstracts', { params });
  return res.data.data;
};

export const adminListConfirmedAbstracts = async (params: {
  track?: string;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminConfirmedAbstract>> => {
  const res = await api.get<{ success: true; data: AdminConfirmedAbstract[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/confirmed-abstracts',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateConfirmedAbstract = async (input: ConfirmedAbstractInput): Promise<AdminConfirmedAbstract> => {
  const res = await api.post<{ success: true; data: AdminConfirmedAbstract }>('/admin/confirmed-abstracts', input);
  return res.data.data;
};

export const adminUpdateConfirmedAbstract = async (
  id: string,
  input: Partial<ConfirmedAbstractInput>
): Promise<AdminConfirmedAbstract> => {
  const res = await api.patch<{ success: true; data: AdminConfirmedAbstract }>(`/admin/confirmed-abstracts/${id}`, input);
  return res.data.data;
};

export const adminDeleteConfirmedAbstract = async (id: string): Promise<void> => {
  await api.delete(`/admin/confirmed-abstracts/${id}`);
};

// --- Open-access compendium (Phase 4) ---

export const adminRecordConsent = async (
  id: string,
  input: { method: CompendiumConsentMethod; evidenceNote: string }
): Promise<AdminConfirmedAbstract> => {
  const res = await api.patch<{ success: true; data: AdminConfirmedAbstract }>(`/admin/confirmed-abstracts/${id}/consent`, input);
  return res.data.data;
};

export const adminBulkRecordConsent = async (input: {
  ids: string[];
  method: CompendiumConsentMethod;
  evidenceNote: string;
}): Promise<{ requested: number; recorded: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { requested: number; recorded: number; failed: number } }>(
    '/admin/confirmed-abstracts/consent/bulk',
    input
  );
  return res.data.data;
};

export const adminSetCompendiumStatus = async (
  id: string,
  status: CompendiumPublicationStatus
): Promise<AdminConfirmedAbstract> => {
  const res = await api.patch<{ success: true; data: AdminConfirmedAbstract }>(`/admin/confirmed-abstracts/${id}/compendium-status`, {
    status,
  });
  return res.data.data;
};
