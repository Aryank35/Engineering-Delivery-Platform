import { Link } from 'react-router-dom';
import {
  AtSign,
  Bell,
  CheckCircle2,
  MessageSquare,
  Play,
  Rocket,
  Server,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { NOTIFICATION_TYPE_META, type NotificationDto, type NotificationType } from '@eop/shared';
import { cn, formatRelativeTime } from '@/lib/utils';

const ICONS: Record<NotificationType, LucideIcon> = {
  WORK_ITEM_ASSIGNED: UserPlus,
  COMMENT_ADDED: MessageSquare,
  MENTION: AtSign,
  SPRINT_STARTED: Play,
  SPRINT_COMPLETED: CheckCircle2,
  RELEASE_PUBLISHED: Rocket,
  DEPLOYMENT_STATUS: Server,
  SYSTEM: Bell,
};

/** Compact unread badge label: hidden at 0, capped at "9+". */
export function formatBadgeCount(count: number): string {
  if (count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = ICONS[type] ?? Bell;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      title={NOTIFICATION_TYPE_META[type]?.label}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

interface NotificationItemProps {
  notification: NotificationDto;
  onNavigate?: () => void;
}

export function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const unread = !notification.readAt;
  const body = (
    <div className={cn('flex gap-3 px-3 py-2.5 transition-colors', unread && 'bg-primary/5')}>
      <NotificationIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{notification.title}</p>
        {notification.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {unread ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      ) : null}
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} onClick={onNavigate} className="block hover:bg-accent">
        {body}
      </Link>
    );
  }
  return <div>{body}</div>;
}
