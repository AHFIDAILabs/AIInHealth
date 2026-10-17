import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // cookies travel automatically — this code never touches tokens directly
});

// Shared in-flight refresh promise: concurrent 401s (e.g. a dashboard firing
// several requests at once right as the session expires) all await the same
// refresh instead of racing their own, so every one of them gets retried
// after it resolves rather than only the first while the rest reject silently.
let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = typeof original?.url === 'string' ? original.url : '';
    // Delegate-portal, reviewer-portal, and rapporteur-portal requests use
    // their own cookie/session (or, for rapporteur, no session at all — just
    // the bearer token in the URL) and must never trigger the admin
    // refresh-token dance or bounce the visitor to /admin/login. The
    // rapporteur check excludes `/admin/rapporteur/...` (the admin-side
    // assignment/review endpoints, a real admin session) — only the public
    // `/rapporteur/:token` routes are auth-exempt here.
    const isAuthRoute =
      url.includes('/auth/') ||
      url.includes('/delegate/') ||
      url.includes('/reviewer/') ||
      (url.includes('/rapporteur/') && !url.startsWith('/admin'));

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });

      try {
        await refreshPromise;
        return api(original);
      } catch {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorShape {
  success: false;
  error: { code: string; message: string; details?: Record<string, string[]> };
}

// Turns a snake/camelCase field name into something readable in an error
// message — "contactPhone" -> "Contact Phone" — since the backend's
// validation `details` are keyed by the raw schema field name, not a label.
const humanizeFieldName = (field: string): string =>
  field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

export const getApiErrorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    // The backend's generic "Validation failed" (validate.middleware.ts) is
    // the same for every field-level rejection — the ACTUAL reason lives in
    // `error.details` (zod's per-field messages), which this previously
    // never surfaced, leaving forms like "Add Exhibitor" showing only
    // "Validation failed" with no way to tell which field was the problem.
    const details = data?.error?.details;
    if (details && Object.keys(details).length > 0) {
      return Object.entries(details)
        .map(([field, messages]) => `${humanizeFieldName(field)}: ${messages?.[0] ?? 'Invalid value'}`)
        .join(' · ');
    }
    return data?.error?.message ?? fallback;
  }
  return fallback;
};
