import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { NotificationDto } from '@eop/shared';
import { formatBadgeCount, NotificationItem } from './notification-item';

const base: NotificationDto = {
  id: 'n1',
  type: 'WORK_ITEM_ASSIGNED',
  title: 'EOP-7 was assigned to you',
  body: 'Build the notifications feature',
  link: '/work/w7',
  entityType: 'WorkItem',
  entityId: 'w7',
  actor: null,
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe('formatBadgeCount', () => {
  it('hides a zero count and caps at 9+', () => {
    expect(formatBadgeCount(0)).toBe('');
    expect(formatBadgeCount(4)).toBe('4');
    expect(formatBadgeCount(9)).toBe('9');
    expect(formatBadgeCount(42)).toBe('9+');
  });
});

describe('NotificationItem', () => {
  it('renders the title and links to the entity', () => {
    render(
      <MemoryRouter>
        <NotificationItem notification={base} />
      </MemoryRouter>,
    );
    expect(screen.getByText('EOP-7 was assigned to you')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/work/w7');
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
  });

  it('omits the unread marker once read', () => {
    render(
      <MemoryRouter>
        <NotificationItem notification={{ ...base, readAt: new Date().toISOString() }} />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument();
  });
});
