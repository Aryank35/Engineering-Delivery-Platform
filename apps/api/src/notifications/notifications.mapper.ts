import { Prisma } from '@eop/database';
import type { NotificationDto, NotificationType } from '@eop/shared';
import { USER_REF_SELECT, toUserRef } from '../work-items/work-items.mapper';

export const NOTIFICATION_INCLUDE = {
  actor: { select: USER_REF_SELECT },
} satisfies Prisma.NotificationInclude;

export type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof NOTIFICATION_INCLUDE }>;

export function toNotification(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    entityType: row.entityType,
    entityId: row.entityId,
    actor: toUserRef(row.actor),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
