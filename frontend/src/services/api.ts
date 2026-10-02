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

export const getApiErrorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    return data?.error?.message ?? fallback;
  }
  return fallback;
};
