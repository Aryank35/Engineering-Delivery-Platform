import { api } from '@/lib/api-client';
import type {
  ListNotificationsQuery,
  NotificationDto,
  Paginated,
  UnreadCountDto,
} from '@eop/shared';

export const notificationsApi = {
  list: (query: Partial<ListNotificationsQuery>) =>
    api.get<Paginated<NotificationDto>>('/notifications', { params: query }).then((r) => r.data),
  unreadCount: () =>
    api.get<UnreadCountDto>('/notifications/unread-count').then((r) => r.data),
  markRead: (ids: string[]) =>
    api.post<UnreadCountDto>('/notifications/mark-read', { ids }).then((r) => r.data),
  markAllRead: () => api.post<UnreadCountDto>('/notifications/read-all').then((r) => r.data),
};
