import type { NotificationType } from '../domain/notifications';
import type { UserRef } from './work-items';

/** A single in-app notification delivered to one recipient. */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Client route to the originating entity, e.g. `/work/<id>`. */
  link: string | null;
  /** Typed reference to the source entity, for grouping/filtering. */
  entityType: string | null;
  entityId: string | null;
  /** The user whose action produced this notification (null for SYSTEM). */
  actor: UserRef | null;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountDto {
  count: number;
}

/**
 * Lightweight payload pushed over Socket.IO to the recipient's `user:<id>` room
 * when a new notification is created — enough to raise a toast; the client
 * refetches the list/count for the source of truth.
 */
export interface NotificationPushPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
}
