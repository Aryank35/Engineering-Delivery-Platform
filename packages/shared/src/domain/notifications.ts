/**
 * Notification vocabulary. Values mirror the Prisma `NotificationType` enum
 * exactly so the same strings flow through the API, the database and the web
 * client. Each type carries a short label and a lucide-react icon name the web
 * uses to render the notification feed.
 */
export const NOTIFICATION_TYPES = [
  'WORK_ITEM_ASSIGNED',
  'COMMENT_ADDED',
  'MENTION',
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
  'RELEASE_PUBLISHED',
  'DEPLOYMENT_STATUS',
  'SYSTEM',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);

export interface NotificationTypeMeta {
  label: string;
  /** lucide-react icon name rendered next to the notification. */
  icon:
    | 'UserPlus'
    | 'MessageSquare'
    | 'AtSign'
    | 'Play'
    | 'CheckCircle2'
    | 'Rocket'
    | 'Server'
    | 'Bell';
}

export const NOTIFICATION_TYPE_META: Record<NotificationType, NotificationTypeMeta> = {
  WORK_ITEM_ASSIGNED: { label: 'Assigned', icon: 'UserPlus' },
  COMMENT_ADDED: { label: 'Comment', icon: 'MessageSquare' },
  MENTION: { label: 'Mention', icon: 'AtSign' },
  SPRINT_STARTED: { label: 'Sprint started', icon: 'Play' },
  SPRINT_COMPLETED: { label: 'Sprint completed', icon: 'CheckCircle2' },
  RELEASE_PUBLISHED: { label: 'Release', icon: 'Rocket' },
  DEPLOYMENT_STATUS: { label: 'Deployment', icon: 'Server' },
  SYSTEM: { label: 'System', icon: 'Bell' },
};
