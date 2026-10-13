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

export interface ConfirmedAttendeeBreakdown {
  records: number;
  seats: number;
  byTicketCategory: { category: string; count: number; revenueNaira: number }[];
  byDiscountTier: { tier: number; label: string; count: number }[];
  byPaymentStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byRegistrationMode: { individual: number; group: number; groupSeats: number };
  byCheckIn: { checkedIn: number; notCheckedIn: number };
  confirmedByDay: { date: string; count: number }[];
}

// Backs the "what makes up the confirmed list" breakdown on the Confirmed
// Attendees view (AttendeesPage.tsx) — every number here is already scoped to
// type:'attendee', status:'confirmed' server-side, so nothing here needs to
// be re-filtered against the page's own status/payment/ticket filters.
export const fetchConfirmedAttendeeBreakdown = async (): Promise<ConfirmedAttendeeBreakdown> => {
  const res = await api.get<{ success: true; data: ConfirmedAttendeeBreakdown }>('/admin/attendees-stats/confirmed-breakdown');
  return res.data.data;
};
