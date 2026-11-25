import axios from 'axios';
import type { ApiErrorShape } from '../../../services/api';

// Unlike services/api.ts's getApiErrorMessage (which shows ANY backend error
// message verbatim), this only surfaces the backend's own text for a known,
// intentionally-public error code — every message behind one of these was
// written by reports.controller.ts/reportAccess.service.ts specifically to be
// shown to a visitor. Anything else (a stale/misconfigured deploy returning
// the generic "Route not found: POST /api/v1/..." 404, a 500, a network
// failure) falls back to a generic message instead, so a visitor never sees
// an exact API route/method leaked onto the page — see the gate's own
// incident (2026-11-25): a not-yet-deployed backend surfaced that raw text
// straight into the modal.
const SAFE_CODES = new Set(['ACCESS_CODE_INVALID', 'ACCESS_CODE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'UNAUTHENTICATED']);

export const getReportErrorMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as ApiErrorShape | undefined;

  // Field-level validation messages (zod, via validate.middleware.ts) are
  // also always safe — they describe what the visitor typed, not the API.
  const details = data?.error?.details;
  if (details && Object.keys(details).length > 0) {
    return Object.entries(details)
      .map(([, messages]) => messages?.[0])
      .filter(Boolean)
      .join(' · ') || fallback;
  }

  const code = data?.error?.code;
  if (code && SAFE_CODES.has(code)) return data?.error?.message ?? fallback;
  return fallback;
};
