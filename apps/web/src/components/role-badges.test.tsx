import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadges } from './role-badges';

describe('RoleBadges', () => {
  it('renders human-readable role names', () => {
    render(<RoleBadges roles={['ADMIN', 'DEVELOPER']} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders a dash when there are no roles', () => {
    render(<RoleBadges roles={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
