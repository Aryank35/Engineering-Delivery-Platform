import { describe, expect, it } from 'vitest';
import { computeElapsedSeconds, formatClock, formatDuration } from '@eop/shared';

describe('time helpers (web)', () => {
  it('formats a clock string', () => {
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(0)).toBe('0:00:00');
  });

  it('formats a compact duration', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(45)).toBe('45s');
  });

  it('adds live seconds only while running', () => {
    const now = 2_000_000;
    expect(computeElapsedSeconds(30, 'RUNNING', now - 5000, now)).toBe(35);
    expect(computeElapsedSeconds(30, 'PAUSED', null, now)).toBe(30);
  });
});
