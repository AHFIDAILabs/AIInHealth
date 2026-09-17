import { api } from './api';

export interface AttendeeStats {
  total: number;
  confirmed: number;
  checkedIn: number;
  checkInRate: number;
  revenueNaira: number;
}

export const fetchAttendeeStats = async (): Promise<AttendeeStats> => {
  const res = await api.get<{ success: true; data: AttendeeStats }>('/admin/attendees-stats');
  return res.data.data;
};
