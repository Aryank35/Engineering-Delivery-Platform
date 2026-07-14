import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeploymentStatusBadge, ReleaseStatusBadge } from './status-badge';

describe('ReleaseStatusBadge', () => {
  it('renders the human-readable status label', () => {
    render(<ReleaseStatusBadge status="RELEASED" />);
    expect(screen.getByText('Released')).toBeInTheDocument();
  });
});

describe('DeploymentStatusBadge', () => {
  it('renders the human-readable status label', () => {
    render(<DeploymentStatusBadge status="ROLLED_BACK" />);
    expect(screen.getByText('Rolled back')).toBeInTheDocument();
  });
});
