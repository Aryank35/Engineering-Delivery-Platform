import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ListNotificationsQuery, NotificationPushPayload } from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { notificationsApi } from './notifications.api';

const ROOT_KEY = ['notifications'] as const;

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ROOT_KEY });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    staleTime: 15_000,
  });
}

export function useNotifications(query: Partial<ListNotificationsQuery>, enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'list', query],
    queryFn: () => notificationsApi.list(query),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => invalidate(qc),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => invalidate(qc),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

/**
 * Subscribe to the current user's personal notification stream. Mounted once
 * (in the topbar bell): raises a toast for each new notification and refetches
 * the list/count on new + cross-tab read events.
 */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const onNew = (payload: NotificationPushPayload) => {
      invalidate(qc);
      toast(payload.title, payload.body ? { description: payload.body } : undefined);
    };
    const onRead = () => invalidate(qc);
    socket.on('notification:new', onNew);
    socket.on('notifications:read', onRead);
    return () => {
      socket.off('notification:new', onNew);
      socket.off('notifications:read', onRead);
    };
  }, [qc]);
}
