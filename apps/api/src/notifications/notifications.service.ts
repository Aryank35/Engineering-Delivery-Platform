import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  buildPageMeta,
  type ListNotificationsQuery,
  type NotificationDto,
  type NotificationType,
  type Paginated,
  type UnreadCountDto,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NOTIFICATION_INCLUDE, toNotification } from './notifications.mapper';

/** Everything a domain service needs to raise a single notification. */
export interface NotificationSpec {
  /** The recipient. */
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Client route to the source entity, e.g. `/work/<id>`. */
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  /** The user whose action produced this (used to suppress self-notifications). */
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  // --- Emission (called by other domain services) -----------------------------

  /**
   * Create one notification and push it to the recipient in real time. A user
   * is never notified about their own action. Failures are swallowed and logged
   * so a notification never breaks the operation that triggered it.
   */
  async emit(spec: NotificationSpec): Promise<void> {
    if (spec.actorId && spec.actorId === spec.userId) return;
    try {
      const row = await this.prisma.notification.create({
        data: {
          userId: spec.userId,
          type: spec.type,
          title: spec.title,
          body: spec.body ?? null,
          link: spec.link ?? null,
          entityType: spec.entityType ?? null,
          entityId: spec.entityId ?? null,
          actorId: spec.actorId ?? null,
          metadata:
            spec.metadata === undefined || spec.metadata === null
              ? Prisma.JsonNull
              : (spec.metadata as Prisma.InputJsonValue),
        },
      });
      this.realtime.emitNotification(spec.userId, {
        id: row.id,
        type: spec.type,
        title: spec.title,
        body: spec.body ?? null,
        link: spec.link ?? null,
      });
    } catch (error) {
      this.logger.error(`Failed to emit notification to ${spec.userId}`, error as Error);
    }
  }

  /**
   * Fan a single notification out to several recipients (deduped, actor
   * excluded). Convenient for comment / sprint events.
   */
  async emitToMany(
    recipientIds: Array<string | null | undefined>,
    spec: Omit<NotificationSpec, 'userId'>,
  ): Promise<void> {
    const unique = new Set(
      recipientIds.filter((id): id is string => Boolean(id) && id !== spec.actorId),
    );
    await Promise.all([...unique].map((userId) => this.emit({ ...spec, userId })));
  }

  // --- Recipient-facing queries -----------------------------------------------

  async list(userId: string, query: ListNotificationsQuery): Promise<Paginated<NotificationDto>> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: NOTIFICATION_INCLUDE,
        orderBy: { createdAt: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data: rows.map(toNotification),
      meta: buildPageMeta(query.page, query.pageSize, total),
    };
  }

  async unreadCount(userId: string): Promise<UnreadCountDto> {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(userId: string, ids: string[]): Promise<UnreadCountDto> {
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId, readAt: null },
      data: { readAt: new Date() },
    });
    this.realtime.emitNotificationsRead(userId);
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string): Promise<UnreadCountDto> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    this.realtime.emitNotificationsRead(userId);
    return { count: 0 };
  }
}
