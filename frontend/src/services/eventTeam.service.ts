import { api } from './api';

export const TEAM_MEMBER_DAYS = ['day1', 'day2', 'both'] as const;
export type TeamMemberDay = (typeof TEAM_MEMBER_DAYS)[number];

export interface EventTeamMember {
  _id: string;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  day: TeamMemberDay;
  notes?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface EventTeamMemberInput {
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  day?: TeamMemberDay;
  notes?: string;
  order?: number;
  isActive?: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListEventTeam = async (params: { q?: string; day?: TeamMemberDay; limit?: number }): Promise<Paginated<EventTeamMember>> => {
  const res = await api.get<{ success: true; data: EventTeamMember[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/event-team',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateEventTeamMember = async (input: EventTeamMemberInput): Promise<EventTeamMember> => {
  const res = await api.post<{ success: true; data: EventTeamMember }>('/admin/event-team', input);
  return res.data.data;
};

export const adminUpdateEventTeamMember = async (id: string, input: Partial<EventTeamMemberInput>): Promise<EventTeamMember> => {
  const res = await api.patch<{ success: true; data: EventTeamMember }>(`/admin/event-team/${id}`, input);
  return res.data.data;
};

export const adminDeleteEventTeamMember = async (id: string): Promise<void> => {
  await api.delete(`/admin/event-team/${id}`);
};
