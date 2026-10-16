import { api } from './api';
import type { AdminSession } from './session.service';
import type { Gender } from './registration.service';

export interface DelegateMe {
  id: string;
  // 'team' included — registration.controller.ts's requestAccessCode has no
  // type filter, so a team/staff/organizer registration logs into this same
  // portal too (used by PortalMyCard.tsx to show the right role label).
  type: 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer' | 'team' | 'innovator';
  name: string;
  email: string | null;
  phone?: string;
  organization?: string;
  ticketCategory?: string;
  status: 'pending' | 'reviewed' | 'confirmed' | 'declined';
  paymentStatus: 'not_required' | 'unpaid' | 'paid' | 'failed';
  checkedIn: boolean;
  checkedInAt?: string;
  hasTicket: boolean;
  directoryOptIn: boolean;
  avatarUrl?: string;
  // Self-reported, optional — see backend/src/types/enums.ts's GENDERS
  // comment on why the portal is one of three chances to catch this. `null`
  // (not just missing) means "hasn't answered yet," so the portal can show a
  // one-time prompt rather than silently never asking.
  gender: Gender | null;
  // Just ids — enough for any page rendering a session card (the public
  // Agenda, "Build My Day") to show bookmark state without its own fetch.
  // Full session data for the "My Agenda" portal page comes from
  // fetchMyBookmarks below.
  bookmarkedSessionIds?: string[];
  // Volunteer only.
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
  // Exhibitor only — backs the "Visit Our Booth" card (PortalMyCard.tsx).
  companyName?: string;
  boothSize?: string;
  // Admin-assigned physical booth, distinct from boothSize — see
  // Registration.model.ts's own comment on the two fields' difference.
  boothNumber?: string;
  productsDescription?: string;
  website?: string;
  // Company logo, self-uploaded on "My Card" — separate from avatarUrl,
  // which is the contact person's own photo.
  logoUrl?: string;
  // Admin replies waiting in /portal/messages — see fetchPortalMessages.
  unreadPortalMessages: number;
  // Gamification — Engagement Score + public Leaderboard. leaderboardOptIn is
  // the delegate's own raw tri-state choice (null = never touched it);
  // leaderboardVisible is the server-resolved effective boolean (team
  // exclusion + sensitive-category default + this flag collapsed into one),
  // which is what UI copy should actually key off. Both precomputed on a
  // schedule — see backend/src/jobs/engagementScore.job.ts.
  leaderboardOptIn: boolean | null;
  leaderboardVisible: boolean;
  engagementScore: number;
  engagementRank: number | null;
}

// Email-only login — no code to request/verify. See delegate.controller.ts's
// login for why this is deliberately simpler than the old two-step flow: the
// friction of copying a code out of an email was stopping people from
// bothering to sign in (and generate their "I will be attending" card).
export const delegateLogin = async (email: string): Promise<void> => {
  await api.post('/delegate/login', { email });
};

export const fetchDelegateMe = async (): Promise<DelegateMe> => {
  const res = await api.get<{ success: true; data: DelegateMe }>('/delegate/me');
  return res.data.data;
};

export const delegateLogout = async (): Promise<void> => {
  await api.post('/delegate/logout');
};

export interface PortalMessage {
  id: string;
  body: string;
  createdAt: string;
}

// Admin replies to this delegate's own contact-form message(s) — see
// contact.controller.ts's adminReply. Fetching this list also marks every
// currently-unread message as read server-side (no separate mark-read call).
export const fetchPortalMessages = async (): Promise<PortalMessage[]> => {
  const res = await api.get<{ success: true; data: PortalMessage[] }>('/delegate/portal-messages');
  return res.data.data;
};

export interface SpeakerSession {
  id: string;
  title: string;
  day: 'day1' | 'day2';
  startTime: string;
  endTime: string;
  room: string;
}

export interface SpeakerSessionsResult {
  isSpeaker: boolean;
  photoUrl: string | null;
  sessions: SpeakerSession[];
}

// Backs the "I am speaking at AIHS 2026" card (PortalMyCard.tsx) — isSpeaker
// is false, not an error, for the common case of a delegate who isn't one.
export const fetchSpeakerSessions = async (): Promise<SpeakerSessionsResult> => {
  const res = await api.get<{ success: true; data: SpeakerSessionsResult }>('/delegate/speaker-sessions');
  return res.data.data;
};

export const fetchTicketQr = async (): Promise<string> => {
  const res = await api.get<{ success: true; data: { qrDataUrl: string } }>('/delegate/ticket/qr');
  return res.data.data.qrDataUrl;
};

// "Email me a copy" from inside the portal — resends the access code and (if
// a ticket exists yet) the QR check-in email, same as requestAccessCode on
// the pre-login PortalLogin.tsx page, but for an already-signed-in delegate.
export const resendTicketEmail = async (): Promise<string> => {
  const res = await api.post<{ success: true; data: { ok: true; sentTo: string } }>('/delegate/resend-ticket');
  return res.data.data.sentTo;
};

export interface UpdateDelegateProfileInput {
  name?: string;
  phone?: string;
  organization?: string;
  avatarUrl?: string;
  gender?: Gender;
  logoUrl?: string;
}

// Email is deliberately not editable here — it's the access-code identity anchor.
export const updateDelegateProfile = async (input: UpdateDelegateProfileInput): Promise<void> => {
  await api.patch('/delegate/profile', input);
};

// Session-bookmarking feature (the public Agenda page's bookmark toggle +
// the portal's "My Agenda" page). bookmarkSession/unbookmarkSession are both
// idempotent server-side — calling either twice in a row is a harmless
// no-op, never an error, so a slow network double-click can't surface
// anything odd to the delegate.
export const bookmarkSession = async (sessionId: string): Promise<void> => {
  await api.post(`/delegate/sessions/${sessionId}/bookmark`);
};

export const unbookmarkSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/delegate/sessions/${sessionId}/bookmark`);
};

// Full session data (same AdminSession shape the public Agenda uses) for
// every session this delegate has bookmarked — not just the ids DelegateMe
// carries, since neither "My Agenda" nor its .ics export can render
// anything from an id alone.
export const fetchMyBookmarks = async (): Promise<AdminSession[]> => {
  const res = await api.get<{ success: true; data: AdminSession[] }>('/delegate/bookmarks');
  return res.data.data;
};

export const updateDirectoryOptIn = async (directoryOptIn: boolean): Promise<boolean> => {
  const res = await api.patch<{ success: true; data: { directoryOptIn: boolean } }>('/delegate/directory-opt-in', {
    directoryOptIn,
  });
  return res.data.data.directoryOptIn;
};

export const updateLeaderboardOptIn = async (leaderboardOptIn: boolean): Promise<boolean | null> => {
  const res = await api.patch<{ success: true; data: { leaderboardOptIn: boolean | null } }>('/delegate/leaderboard-opt-in', {
    leaderboardOptIn,
  });
  return res.data.data.leaderboardOptIn;
};

export interface LeaderboardEntry {
  id: string;
  name: string;
  organization: string | null;
  avatarUrl: string | null;
  score: number;
  rank: number;
  badges: string[];
  isYou: boolean;
}

export interface LeaderboardBreakdown {
  checkIn: number;
  meetings: number;
  bookmarks: number;
  profile: number;
}

export interface LeaderboardYou {
  rank: number | null;
  score: number;
  breakdown: LeaderboardBreakdown;
  badges: string[];
  previousRank: number | null;
  visible: boolean;
  leaderboardOptIn: boolean | null;
  ticketCategory?: string;
  type: string;
}

export interface LeaderboardResult {
  computedAt: string | null;
  top: LeaderboardEntry[];
  you: LeaderboardYou;
}

export const fetchLeaderboard = async (): Promise<LeaderboardResult> => {
  const res = await api.get<{ success: true; data: LeaderboardResult }>('/delegate/leaderboard');
  return res.data.data;
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const isDelegatePushSupported = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window;

// Mirrors push.service.ts's admin flow exactly, pointed at the /delegate/push/*
// endpoints and reusing the same generic sw.js (it just reads title/body/url off
// whatever payload the server sends, no admin-specific logic).
export const enableDelegatePush = async (): Promise<void> => {
  if (!isDelegatePushSupported()) throw new Error('Push notifications are not supported in this browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const res = await api.get<{ success: true; data: { publicKey: string; configured: boolean } }>('/delegate/push/public-key');
  const { publicKey, configured } = res.data.data;
  if (!configured) throw new Error('Push notifications are not configured on the server yet.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  await api.post('/delegate/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
};

export const disableDelegatePush = async (): Promise<void> => {
  if (!isDelegatePushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await api.post('/delegate/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
};
