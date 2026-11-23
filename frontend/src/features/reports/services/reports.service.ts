import { api } from '../../../services/api';
import { REPORTS } from '../../../content/2026/reports';
import type { ReportSession } from '../types';

// The library/session pages group REPORTS (the bundled, public, file-less
// manifest subset) by sessionId — grouping happens client-side since the
// bundled data already has everything needed; GET /reports (reports.service's
// `fetchReports` below) exists for admin/debug parity with the backend's own
// REPORTS_MANIFEST, not because the UI needs a network round trip for data
// it already has at build time.
export const groupReportsBySession = (): ReportSession[] => {
  const bySession = new Map<string, ReportSession>();
  for (const entry of REPORTS) {
    const existing = bySession.get(entry.sessionId);
    if (existing) {
      existing.docs.push(entry);
      continue;
    }
    bySession.set(entry.sessionId, {
      sessionId: entry.sessionId,
      sessionTitle: entry.sessionTitle,
      venue: entry.venue,
      day: entry.day,
      dayInferred: entry.dayInferred,
      partners: entry.partners,
      docs: [entry],
    });
  }
  return [...bySession.values()];
};

// --- Email gate ---

export const requestReportAccessCode = async (email: string, firstName: string): Promise<void> => {
  await api.post('/reports/request-code', { email, firstName });
};

export const verifyReportAccessCode = async (email: string, code: string): Promise<void> => {
  await api.post('/reports/verify-code', { email, code });
};

export interface ReportAccessMe {
  email: string;
  firstName: string;
}

// Resolves to `null` (not a thrown error) on a 401 — callers use this to
// decide whether to render the gate, not to report a failure.
export const fetchReportAccessMe = async (): Promise<ReportAccessMe | null> => {
  try {
    const res = await api.get<{ success: true; data: ReportAccessMe }>('/reports/me');
    return res.data.data;
  } catch {
    return null;
  }
};

export const reportAccessLogout = async (): Promise<void> => {
  await api.post('/reports/logout');
};

// Requires a prior verify-code — the backend's own requireReportAccess
// middleware is the real enforcement, this just reflects its one error shape.
export const requestReportDownloadUrl = async (reportId: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { url: string } }>('/reports/download', { reportId });
  return res.data.data.url;
};
