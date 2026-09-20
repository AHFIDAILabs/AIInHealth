import { api } from './api';

// Every field here is already safe for public display (see backend
// InnovationShowcaseEntry.model.ts's header comment) — the public and admin
// shapes are the same, unlike ConfirmedAbstract's internalNotes split.
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
