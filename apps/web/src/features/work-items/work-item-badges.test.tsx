import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge, StatusBadge, TypeBadge } from './work-item-badges';

describe('work item badges', () => {
  it('renders the human type label', () => {
    render(<TypeBadge type="STORY" />);
    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('renders the human status label', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the human priority label', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });
});
