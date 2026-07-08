import { create } from 'zustand';
import type { AuthenticatedUser, PermissionKey, RoleKey } from '@eop/shared';
import { setAccessToken } from '@/lib/api-client';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  setSession: (user: AuthenticatedUser, token: string) => void;
  updateUser: (user: AuthenticatedUser) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyRole: (...roles: RoleKey[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  setSession: (user, token) => {
    setAccessToken(token);
    set({ user, status: 'authenticated' });
  },
  updateUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => {
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  },
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
  hasAnyRole: (...roles) => {
    const user = get().user;
    return user ? user.roles.some((role) => roles.includes(role)) : false;
  },
}));
