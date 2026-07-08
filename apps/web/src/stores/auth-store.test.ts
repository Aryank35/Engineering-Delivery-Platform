import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '@eop/shared';
import { useAuthStore } from './auth-store';

const user: AuthenticatedUser = {
  id: '1',
  email: 'admin@eop.dev',
  firstName: 'Admin',
  lastName: 'User',
  fullName: 'Admin User',
  avatarUrl: null,
  timezone: null,
  isActive: true,
  roles: ['ADMIN'],
  permissions: ['user:read', 'user:create'],
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('auth store', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('starts unauthenticated after clear', () => {
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('reflects permissions and roles once a session is set', () => {
    useAuthStore.getState().setSession(user, 'access-token');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.hasPermission('user:create')).toBe(true);
    expect(state.hasPermission('user:delete')).toBe(false);
    expect(state.hasAnyRole('ADMIN')).toBe(true);
    expect(state.hasAnyRole('VIEWER')).toBe(false);
  });
});
