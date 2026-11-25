import { describe, it, expect } from 'vitest';
import { getReportErrorMessage } from './reportsErrorMessage';

// axios.isAxiosError() only checks the `isAxiosError` flag, so a plain object
// shaped like one is enough to exercise this without a real request.
const axiosError = (data: unknown) => ({ isAxiosError: true, response: { data } });

const FALLBACK = 'Something went wrong. Please try again.';

describe('getReportErrorMessage', () => {
  it('shows the backend message for a known, intentionally-public code', () => {
    const err = axiosError({ success: false, error: { code: 'ACCESS_CODE_INVALID', message: 'That email/access code combination is invalid.' } });
    expect(getReportErrorMessage(err, FALLBACK)).toBe('That email/access code combination is invalid.');
  });

  it('shows field-validation messages', () => {
    const err = axiosError({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { email: ['Enter a valid email'] } } });
    expect(getReportErrorMessage(err, FALLBACK)).toBe('Enter a valid email');
  });

  // The exact regression this guards against (2026-11-25): a not-yet-deployed
  // backend returned the generic Express 404 handler's own message, which
  // names the real route/method — this must NEVER reach the visitor verbatim.
  it('falls back to the generic message for an unrecognized code (e.g. a stale-deploy 404)', () => {
    const err = axiosError({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found: POST /api/v1/reports/request-code' } });
    expect(getReportErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back to the generic message for a non-axios error', () => {
    expect(getReportErrorMessage(new Error('network blip'), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back to the generic message when there is no response body at all', () => {
    expect(getReportErrorMessage({ isAxiosError: true }, FALLBACK)).toBe(FALLBACK);
  });
});
