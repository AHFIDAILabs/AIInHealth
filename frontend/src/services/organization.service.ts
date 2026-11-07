import { api } from './api';

// Mirrors backend/src/validations/organization.validation.ts's
// ORGANIZATION_PARTICIPANT_TYPES — 'team' deliberately excluded, same
// reasoning as analytics.service.ts's attendee-specific figures.
export const ORGANIZATION_PARTICIPANT_TYPES = ['attendee', 'exhibitor', 'sponsor', 'volunteer', 'innovator'] as const;
export type OrganizationParticipantType = (typeof ORGANIZATION_PARTICIPANT_TYPES)[number];

export interface OrganizationGroup {
  displayName: string;
  count: number;
  types: OrganizationParticipantType[];
  // Every distinct raw spelling merged into this group (case/whitespace
  // normalized only — see the backend's own comment on why true
  // abbreviation/spelling variants like "ABU" aren't auto-merged).
  rawVariants: string[];
}

export interface OrganizationsSummary {
  totalRegistrations: number;
  uniqueOrganizations: number;
  byType: Record<OrganizationParticipantType, number>;
}

export interface ListOrganizationsParams {
  type?: OrganizationParticipantType;
  q?: string;
}

export const adminListOrganizations = async (
  params: ListOrganizationsParams
): Promise<{ items: OrganizationGroup[]; summary: OrganizationsSummary }> => {
  const res = await api.get<{ success: true; data: OrganizationGroup[]; meta: OrganizationsSummary }>(
    '/admin/organizations',
    { params }
  );
  return { items: res.data.data, summary: res.data.meta };
};

export const exportOrganizationsUrl = (params: ListOrganizationsParams): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/organizations/export?${search.toString()}`;
};
