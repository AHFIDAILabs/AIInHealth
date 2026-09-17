import { api } from './api';

export interface PublicVolunteer {
  id: string;
  fullName: string;
  avatarUrl?: string;
  track?: string;
}

export const listPublicVolunteers = async (): Promise<PublicVolunteer[]> => {
  const res = await api.get<{ success: true; data: PublicVolunteer[] }>('/volunteers');
  return res.data.data;
};
