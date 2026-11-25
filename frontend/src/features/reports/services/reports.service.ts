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

// "View" — resolves the real Render asset URL for the browser's own PDF
// viewer to open inline. Requires a prior verify-code — the backend's own
// requireReportAccess middleware is the real enforcement, this just reflects
// its one error shape.
export const requestReportViewUrl = async (reportId: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { url: string } }>('/reports/view', { reportId });
  return res.data.data.url;
};

// "Download" — a plain GET URL (not a fetch call): the backend proxies the
// file and sets Content-Disposition: attachment there, so a normal browser
// navigation to this URL (an <a href>, not window.open/fetch) forces a real
// save-to-disk regardless of the visitor's own PDF-viewer settings. The
// report_token cookie travels with this GET the same way it would with any
// other cross-subdomain navigation — no extra plumbing needed.
export const reportDownloadFileUrl = (reportId: string): string => {
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/reports/${reportId}/file`;
};
