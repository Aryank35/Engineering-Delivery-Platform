import type { ReactNode } from 'react';
import type { PermissionKey, RoleKey } from '@eop/shared';
import { useAuthStore } from '@/stores/auth-store';

interface PermissionGateProps {
  permission?: PermissionKey;
  roles?: RoleKey[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the current user satisfies the permission/role. */
export function PermissionGate({
  permission,
  roles,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyRole = useAuthStore((s) => s.hasAnyRole);

  const allowed =
    (permission ? hasPermission(permission) : true) && (roles ? hasAnyRole(...roles) : true);

  return <>{allowed ? children : fallback}</>;
}
