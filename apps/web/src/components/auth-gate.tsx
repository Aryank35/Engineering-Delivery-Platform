import { useEffect, useState, type ReactNode } from 'react';
import { restoreAccessToken, setUnauthorizedHandler } from '@/lib/api-client';
import { authApi } from '@/features/auth/auth.api';
import { useAuthStore } from '@/stores/auth-store';
import { FullPageSpinner } from '@/components/ui/spinner';

/** Restores the session from the refresh cookie before rendering the app. */
export function AuthGate({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => useAuthStore.getState().clear());

    let active = true;
    void (async () => {
      const token = await restoreAccessToken();
      if (!token) {
        if (active) {
          clear();
          setReady(true);
        }
        return;
      }
      try {
        const user = await authApi.me();
        if (active) setSession(user, token);
      } catch {
        if (active) clear();
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [setSession, clear]);

  if (!ready) {
    return <FullPageSpinner label="Loading your workspace…" />;
  }
  return <>{children}</>;
}
