import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MagnitudeBars, weekLabel } from './charts';

describe('MagnitudeBars', () => {
  it('renders each row with its label and hint', () => {
    render(
      <MagnitudeBars
        rows={[
          { label: 'Ada Lovelace', value: 8, hint: '8 open · 13 pts' },
          { label: 'Alan Turing', value: 3 },
        ]}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('8 open · 13 pts')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    // Falls back to the raw value when no hint is given.
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('weekLabel', () => {
  it('formats an ISO week-start into a short date', () => {
    const label = weekLabel('2026-02-02T00:00:00.000Z');
    expect(typeof label).toBe('string');
    expect(label).toContain('2');
  });
});
