import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // cookies travel automatically — this code never touches tokens directly
});

let isRefreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = typeof original?.url === 'string' ? original.url : '';
    // Delegate-portal requests use their own cookie/session and must never trigger
    // the admin refresh-token dance or bounce the visitor to /admin/login.
    const isAuthRoute = url.includes('/auth/') || url.includes('/delegate/');

    if (error.response?.status === 401 && !original._retry && !isRefreshing && !isAuthRoute) {
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        return api(original);
      } catch {
        window.location.href = '/admin/login';
      } finally {
        isRefreshing = false;
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
