import { api } from './api';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const isPushSupported = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window;

export const fetchVapidPublicKey = async (): Promise<{ publicKey: string; configured: boolean }> => {
  const res = await api.get<{ success: true; data: { publicKey: string; configured: boolean } }>('/admin/push/public-key');
  return res.data.data;
};

// Requests browser permission, registers the service worker, subscribes, and
// tells the backend about the new subscription — the whole flow behind Settings'
// "Desktop push notifications" toggle.
export const enablePush = async (): Promise<void> => {
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const { publicKey, configured } = await fetchVapidPublicKey();
  if (!configured) throw new Error('Push notifications are not configured on the server yet.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  await api.post('/admin/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
};

export const disablePush = async (): Promise<void> => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await api.post('/admin/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
};
