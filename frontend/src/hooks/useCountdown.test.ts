import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes days/hours/minutes/seconds remaining until the target', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(now);
    const target = new Date('2026-01-03T02:30:15.000Z'); // 2d 2h 30m 15s away

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toEqual({ days: 2, hours: 2, minutes: 30, seconds: 15 });
  });

  it('never goes negative once the target has passed', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');
    vi.setSystemTime(now);
    const target = new Date('2026-01-01T00:00:00.000Z'); // already in the past

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('ticks down as time advances', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(now);
    const target = new Date('2026-01-01T00:00:10.000Z'); // 10s away

    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.seconds).toBe(10);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.seconds).toBe(7);
  });
});
