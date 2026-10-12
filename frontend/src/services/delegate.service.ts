import { api } from './api';

export interface DelegateMe {
  id: string;
  // 'team' included — registration.controller.ts's requestAccessCode has no
  // type filter, so a team/staff/organizer registration logs into this same
  // portal too (used by PortalMyCard.tsx to show the right role label).
  type: 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer' | 'team';
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
  // Volunteer only.
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
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
}

// Email is deliberately not editable here — it's the access-code identity anchor.
export const updateDelegateProfile = async (input: UpdateDelegateProfileInput): Promise<void> => {
  await api.patch('/delegate/profile', input);
};

export const updateDirectoryOptIn = async (directoryOptIn: boolean): Promise<boolean> => {
  const res = await api.patch<{ success: true; data: { directoryOptIn: boolean } }>('/delegate/directory-opt-in', {
    directoryOptIn,
  });
  return res.data.data.directoryOptIn;
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
