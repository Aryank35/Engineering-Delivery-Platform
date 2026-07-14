import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatBadgeCount, NotificationItem } from './notification-item';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
  useNotificationsRealtime,
  useUnreadCount,
} from './use-notifications';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  useNotificationsRealtime();

  const { data: unread } = useUnreadCount();
  const { data, isLoading } = useNotifications({ pageSize: 8 }, open);
  const markAll = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationsRead();

  const count = unread?.count ?? 0;
  const items = data?.data ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={count > 0 ? `Notifications (${count} unread)` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {formatBadgeCount(count)}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            className={cn(
              'inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
              (count === 0 || markAll.isPending) && 'pointer-events-none opacity-40',
            )}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    notification={n}
                    onNavigate={() => {
                      if (!n.readAt) markRead.mutate([n.id]);
                      setOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t px-3 py-2 text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
