import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import type { ListNotificationsQuery } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { NotificationItem } from './notification-item';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useNotificationsRealtime,
  useUnreadCount,
} from './use-notifications';

export function NotificationsPage() {
  useNotificationsRealtime();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const query: Partial<ListNotificationsQuery> = {
    page,
    pageSize: 20,
    order: 'desc',
    ...(unreadOnly ? { unreadOnly: true } : {}),
  };

  const { data, isLoading, isError } = useNotifications(query);
  const { data: unread } = useUnreadCount();
  const markAll = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationsRead();

  const items = data?.data ?? [];
  const meta = data?.meta;
  const unreadCount = unread?.count ?? 0;

  const setFilter = (value: boolean) => {
    setUnreadOnly(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, comments and sprint activity across your work."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="flex gap-2">
        {(
          [
            { label: 'All', value: false },
            { label: `Unread${unreadCount ? ` (${unreadCount})` : ''}`, value: true },
          ] as const
        ).map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              unreadOnly === tab.value
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm text-destructive">
              Failed to load notifications.
            </p>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    notification={n}
                    onNavigate={() => {
                      if (!n.readAt) markRead.mutate([n.id]);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {meta && meta.total > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {meta.total} notification{meta.total === 1 ? '' : 's'} · page {meta.page} of{' '}
            {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
