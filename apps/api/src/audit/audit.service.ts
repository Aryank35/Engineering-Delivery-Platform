import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  buildPageMeta,
  type AuditLogEntry,
  type ListAuditLogsQuery,
  type Paginated,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditActor {
  id: string;
  email: string;
}

export interface AuditRecordInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  actor?: AuditActor | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

const toJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value === undefined || value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

type AuditLogRow = Prisma.AuditLogGetPayload<Record<string, never>>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit entry. Auditing is best-effort: a failure here is logged but
   * never propagated, so it cannot break the primary operation.
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          actorId: input.actor?.id ?? null,
          actorEmail: input.actor?.email ?? null,
          before: toJson(input.before),
          after: toJson(input.after),
          metadata: toJson(input.metadata),
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist audit log for "${input.action}"`, error as Error);
    }
  }

  async list(query: ListAuditLogsQuery): Promise<Paginated<AuditLogEntry>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: rows.map(AuditService.toEntry),
      meta: buildPageMeta(query.page, query.pageSize, total),
    };
  }

  private static toEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      before: row.before ?? null,
      after: row.after ?? null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      ip: row.ip,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
