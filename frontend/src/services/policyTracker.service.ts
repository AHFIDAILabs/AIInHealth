import { api } from './api';

export const POLICY_FRAMEWORK_STATUSES = ['none_identified', 'drafting', 'adopted', 'unclear'] as const;
export type PolicyFrameworkStatus = (typeof POLICY_FRAMEWORK_STATUSES)[number];

// AI-drafted (jobs/policyTrackerRefresh.job.ts, weekly), admin-reviewed —
// only 'approved' entries ever reach the public GET /policy-tracker route.
export const POLICY_ENTRY_STATUSES = ['pending_review', 'approved', 'rejected'] as const;
export type PolicyEntryStatus = (typeof POLICY_ENTRY_STATUSES)[number];

export interface PolicyTrackerEntry {
  _id: string;
  country: string;
  frameworkStatus: PolicyFrameworkStatus;
  summary: string;
  sourceUrl: string;
  lastCheckedAt: string;
  status: PolicyEntryStatus;
  reviewedBy?: { _id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const listPublicPolicyTracker = async (): Promise<PolicyTrackerEntry[]> => {
  const res = await api.get<{ success: true; data: PolicyTrackerEntry[] }>('/policy-tracker');
  return res.data.data;
};

export const adminListPolicyEntries = async (params: {
  status?: PolicyEntryStatus;
  country?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<PolicyTrackerEntry>> => {
  const res = await api.get<{ success: true; data: PolicyTrackerEntry[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/policy-tracker',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdatePolicyEntry = async (
  id: string,
  input: { country?: string; frameworkStatus?: PolicyFrameworkStatus; summary?: string; status?: PolicyEntryStatus }
): Promise<PolicyTrackerEntry> => {
  const res = await api.patch<{ success: true; data: PolicyTrackerEntry }>(`/admin/policy-tracker/${id}`, input);
  return res.data.data;
};

export interface RefreshResult {
  checked: number;
  changed: number;
  failed: number;
}

export const adminRefreshPolicyTrackerNow = async (): Promise<RefreshResult> => {
  const res = await api.post<{ success: true; data: RefreshResult }>('/admin/policy-tracker/refresh-now');
  return res.data.data;
};

// --- Sources (admin-maintained trusted URL list the job fetches weekly) ---

export interface PolicySource {
  _id: string;
  country: string;
  label: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicySourceInput {
  country: string;
  label: string;
  url: string;
  isActive?: boolean;
}

export const adminListPolicySources = async (params: {
  country?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<PolicySource>> => {
  const res = await api.get<{ success: true; data: PolicySource[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/policy-sources',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreatePolicySource = async (input: PolicySourceInput): Promise<PolicySource> => {
  const res = await api.post<{ success: true; data: PolicySource }>('/admin/policy-sources', input);
  return res.data.data;
};

export const adminUpdatePolicySource = async (id: string, input: Partial<PolicySourceInput>): Promise<PolicySource> => {
  const res = await api.patch<{ success: true; data: PolicySource }>(`/admin/policy-sources/${id}`, input);
  return res.data.data;
};

export const adminDeletePolicySource = async (id: string): Promise<void> => {
  await api.delete(`/admin/policy-sources/${id}`);
};
