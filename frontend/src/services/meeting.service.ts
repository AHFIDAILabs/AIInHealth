import { api } from './api';

export interface DirectoryEntry {
  id: string;
  type: 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer';
  name: string;
  organization?: string;
  jobTitle?: string;
}

export const fetchDirectory = async (q?: string): Promise<DirectoryEntry[]> => {
  const res = await api.get<{ success: true; data: DirectoryEntry[] }>('/delegate/directory', { params: { q } });
  return res.data.data;
};

export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface MeetingRequestItem {
  id: string;
  status: MeetingStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
  direction: 'sent' | 'received';
  counterpart: { id: string; name: string; organization?: string; email?: string };
}

export const fetchMeetings = async (): Promise<MeetingRequestItem[]> => {
  const res = await api.get<{ success: true; data: MeetingRequestItem[] }>('/delegate/meetings');
  return res.data.data;
};

export const createMeetingRequest = async (toRegistrationId: string, message?: string): Promise<void> => {
  await api.post('/delegate/meetings', { toRegistrationId, message });
};

export const respondToMeetingRequest = async (id: string, action: 'accept' | 'decline' | 'cancel'): Promise<void> => {
  await api.patch(`/delegate/meetings/${id}`, { action });
};
