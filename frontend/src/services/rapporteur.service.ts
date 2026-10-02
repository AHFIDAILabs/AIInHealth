import { api } from './api';

export interface RapporteurActionItem {
  text: string;
  owner?: string;
  dueDate?: string;
}

export interface RapporteurQuote {
  text: string;
  speaker?: string;
  // Stage 2, Layer 2 "Capture This Quote" — true when this quote's text came
  // from transcribeQuoteAudio rather than being typed directly.
  capturedViaAudio?: boolean;
}

export interface RapporteurSessionInfo {
  _id: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
}

export interface RapporteurReport {
  reportId: string;
  session: RapporteurSessionInfo;
  rapporteurName: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: RapporteurActionItem[];
  notableQuotes: RapporteurQuote[];
  status: 'draft' | 'submitted';
  submittedAt?: string;
  updatedAt: string;
}

export interface RapporteurDraftPatch {
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: RapporteurActionItem[];
  notableQuotes?: RapporteurQuote[];
}

// --- Token-scoped (no admin cookie — the token in the URL is the whole
// credential) ---

export const fetchRapporteurReport = async (token: string): Promise<RapporteurReport> => {
  const res = await api.get<{ success: true; data: RapporteurReport }>(`/rapporteur/${token}`);
  return res.data.data;
};

export const patchRapporteurReport = async (token: string, patch: RapporteurDraftPatch): Promise<{ savedAt: string }> => {
  const res = await api.patch<{ success: true; data: { reportId: string; savedAt: string } }>(`/rapporteur/${token}`, patch);
  return res.data.data;
};

export const submitRapporteurReport = async (
  token: string
): Promise<{ status: 'submitted'; aiPolishedStatus: string | null; aiPolishError: string | null }> => {
  const res = await api.post<{ success: true; data: { status: 'submitted'; aiPolishedStatus: string | null; aiPolishError: string | null } }>(
    `/rapporteur/${token}/submit`
  );
  return res.data.data;
};

// Stage 2, Layer 2 "Capture This Quote" — multipart upload, not JSON; axios
// sets the multipart content-type header automatically for a FormData body.
// Deliberately returns only the transcribed text — it never touches
// notableQuotes itself, the caller adds it via patchRapporteurReport (with
// capturedViaAudio: true) the same way any manually-typed quote is saved.
export const transcribeQuoteAudio = async (token: string, blob: Blob): Promise<{ text: string }> => {
  const form = new FormData();
  form.append('audio', blob, 'quote.webm');
  const res = await api.post<{ success: true; data: { text: string } }>(`/rapporteur/${token}/quotes/transcribe`, form);
  return res.data.data;
};

// --- Admin ---

export interface AssignableSession {
  sessionId: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
  assignment: { reportId: string; rapporteurName: string; rapporteurEmail: string; status: 'draft' | 'submitted' } | null;
}

export const adminListAssignableSessions = async (): Promise<AssignableSession[]> => {
  const res = await api.get<{ success: true; data: AssignableSession[] }>('/admin/rapporteur/sessions');
  return res.data.data;
};

export const adminAssignRapporteur = async (input: {
  sessionId: string;
  rapporteurName: string;
  rapporteurEmail: string;
}): Promise<{ reportId: string; tokenId: string; portalUrl: string }> => {
  const res = await api.post<{ success: true; data: { reportId: string; tokenId: string; portalUrl: string } }>(
    '/admin/rapporteur/assign',
    input
  );
  return res.data.data;
};

export interface AdminSessionReport {
  reportId: string;
  session: RapporteurSessionInfo;
  rapporteurName: string;
  rapporteurEmail: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: RapporteurActionItem[];
  notableQuotes: RapporteurQuote[];
  status: 'draft' | 'submitted';
  submittedAt?: string;
  aiPolishedSummary?: string;
  aiPolishedStatus: 'draft' | 'approved' | null;
  aiPolishError: string | null;
  approvedAt?: string;
}

export const adminListReports = async (status?: 'draft' | 'submitted'): Promise<AdminSessionReport[]> => {
  const res = await api.get<{ success: true; data: AdminSessionReport[] }>('/admin/rapporteur/reports', { params: { status } });
  return res.data.data;
};

export const adminUpdateReport = async (
  reportId: string,
  input: { aiPolishedSummary?: string; aiPolishedStatus?: 'approved' }
): Promise<void> => {
  await api.patch(`/admin/rapporteur/reports/${reportId}`, input);
};

export const adminRetryPolish = async (reportId: string): Promise<void> => {
  await api.post(`/admin/rapporteur/reports/${reportId}/retry-polish`);
};

export interface AdminLiveStatusRow {
  tokenId: string;
  sessionId: string;
  sessionTitle: string;
  rapporteurName: string;
  rapporteurEmail: string;
  status: 'draft' | 'submitted';
  aiPolishedStatus: 'draft' | 'approved' | null;
  lastUsedAt?: string;
  revoked: boolean;
  expiresAt: string;
}

export const adminListLiveStatus = async (): Promise<AdminLiveStatusRow[]> => {
  const res = await api.get<{ success: true; data: AdminLiveStatusRow[] }>('/admin/rapporteur/live-status');
  return res.data.data;
};

export const adminRevokeToken = async (tokenId: string): Promise<void> => {
  await api.post(`/admin/rapporteur/tokens/${tokenId}/revoke`);
};

export const adminResendLink = async (tokenId: string): Promise<{ sentAt: string }> => {
  const res = await api.post<{ success: true; data: { sentAt: string } }>(`/admin/rapporteur/tokens/${tokenId}/resend`);
  return res.data.data;
};

// --- Stage 2, Layer 3 — admin-only live transcript ---

export type LiveTranscriptStatus = 'idle' | 'recording' | 'ended';

export interface LiveTranscriptSession {
  sessionId: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
  isLiveTranscribed: boolean;
  liveTranscriptStatus: LiveTranscriptStatus;
}

export interface LiveTranscriptSegment {
  text: string;
  capturedAt: string;
}

export interface LiveTranscriptDetail {
  sessionId: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
  status: LiveTranscriptStatus;
  segments: LiveTranscriptSegment[];
  startedAt?: string;
  endedAt?: string;
}

export const adminListLiveTranscriptSessions = async (): Promise<LiveTranscriptSession[]> => {
  const res = await api.get<{ success: true; data: LiveTranscriptSession[] }>('/admin/live-transcript/sessions');
  return res.data.data;
};

export const adminGetLiveTranscript = async (sessionId: string): Promise<LiveTranscriptDetail> => {
  const res = await api.get<{ success: true; data: LiveTranscriptDetail }>(`/admin/live-transcript/sessions/${sessionId}`);
  return res.data.data;
};

export const adminStartLiveTranscript = async (sessionId: string): Promise<void> => {
  await api.post(`/admin/live-transcript/sessions/${sessionId}/start`);
};

export const adminStopLiveTranscript = async (sessionId: string): Promise<void> => {
  await api.post(`/admin/live-transcript/sessions/${sessionId}/stop`);
};

export const adminUploadLiveTranscriptChunk = async (sessionId: string, blob: Blob): Promise<LiveTranscriptSegment> => {
  const form = new FormData();
  form.append('audio', blob, 'chunk.webm');
  const res = await api.post<{ success: true; data: LiveTranscriptSegment }>(`/admin/live-transcript/sessions/${sessionId}/chunk`, form);
  return res.data.data;
};
