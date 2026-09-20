import { api } from './api';

export interface DelegateMe {
  id: string;
  type: 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer';
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

export const requestAccessCode = async (email: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/delegate/request-code', { email });
  return res.data.data.message;
};

export const verifyAccessCode = async (email: string, code: string): Promise<void> => {
  await api.post('/delegate/verify-code', { email, code });
};

export const fetchDelegateMe = async (): Promise<DelegateMe> => {
  const res = await api.get<{ success: true; data: DelegateMe }>('/delegate/me');
  return res.data.data;
};

export const delegateLogout = async (): Promise<void> => {
  await api.post('/delegate/logout');
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
