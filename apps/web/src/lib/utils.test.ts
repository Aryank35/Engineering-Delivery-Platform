import { describe, expect, it } from 'vitest';
import { cn, formatRelativeTime, initials } from './utils';

describe('cn', () => {
  it('merges conflicting tailwind classes, keeping the last', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values', () => {
    const hidden = false;
    expect(cn('a', hidden && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('initials', () => {
  it('builds uppercase initials', () => {
    expect(initials('Ada', 'Lovelace')).toBe('AL');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-07-14T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('reports very recent times as "just now"', () => {
    expect(formatRelativeTime(ago(10_000), now)).toBe('just now');
  });

  it('reports minutes, hours and days compactly', () => {
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('5m');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('3h');
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe('2d');
  });

  it('falls back to a date beyond a week', () => {
    expect(formatRelativeTime(ago(10 * 86_400_000), now)).not.toMatch(/^\d+[mhd]$/);
  });
});
