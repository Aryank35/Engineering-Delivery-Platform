import { describe, expect, it } from 'vitest';
import { cn, initials } from './utils';

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
