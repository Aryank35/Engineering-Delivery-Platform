import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { PermissionKey } from '@eop/shared';
import { useAuthStore } from '@/stores/auth-store';

/** Requires an authenticated session; otherwise redirects to /login. */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Redirects already-authenticated users away from public-only pages. */
export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Route-level guard for a required permission. */
export function RequirePermissionRoute({ permission }: { permission: PermissionKey }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
