import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  buildPageMeta,
  computeElapsedSeconds,
  startOfWeek,
  WORK_ITEM_STATUSES,
  type ActiveTimerDto,
  type AuthUser,
  type CreateTimeLogInput,
  type ListTimeLogsQuery,
  type Paginated,
  type StartTimerInput,
  type TimeLogDto,
  type TimeSummary,
  type UpdateTimeLogInput,
  type WorkItemStatus,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { ClientContext } from '../common/utils/request-context';
import {
  TIMER_INCLUDE,
  TIME_LOG_INCLUDE,
  toActiveTimer,
  toTimeLog,
  type TimeLogRow,
  type TimerRow,
} from './time.mapper';

const dateOnly = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

@Injectable()
export class TimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Timer ------------------------------------------------------------------

  async getActiveTimer(userId: string): Promise<ActiveTimerDto | null> {
    const row = await this.prisma.activeTimer.findUnique({
      where: { userId },
      include: TIMER_INCLUDE,
    });
    return row ? toActiveTimer(row, Date.now()) : null;
  }

  async startTimer(
    actor: AuthUser,
    input: StartTimerInput,
    ctx: ClientContext,
  ): Promise<ActiveTimerDto> {
    await this.assertWorkItemExists(input.workItemId);

    const existing = await this.prisma.activeTimer.findUnique({
      where: { userId: actor.id },
      include: TIMER_INCLUDE,
    });
    if (existing) {
      // Starting a new timer commits the running one.
      await this.commit(existing, actor, ctx);
    }

    const now = new Date();
    const created = await this.prisma.activeTimer.create({
      data: {
        userId: actor.id,
        workItemId: input.workItemId,
        status: 'RUNNING',
        accumulatedSeconds: 0,
        startedAt: now,
        lastStartedAt: now,
        description: input.description ?? null,
      },
      include: TIMER_INCLUDE,
    });
    await this.audit.record({
      action: 'time.timer_started',
      entityType: 'WorkItem',
      entityId: input.workItemId,
      actor,
      ...ctx,
    });
    return toActiveTimer(created, Date.now());
  }

  async pauseTimer(userId: string): Promise<ActiveTimerDto> {
    const timer = await this.getTimerRowOrThrow(userId);
    if (timer.status === 'PAUSED') {
      return toActiveTimer(timer, Date.now());
    }
    const accumulated = computeElapsedSeconds(
      timer.accumulatedSeconds,
      'RUNNING',
      timer.lastStartedAt ? timer.lastStartedAt.getTime() : null,
      Date.now(),
    );
    const updated = await this.prisma.activeTimer.update({
      where: { userId },
      data: { status: 'PAUSED', accumulatedSeconds: accumulated, lastStartedAt: null },
      include: TIMER_INCLUDE,
    });
    return toActiveTimer(updated, Date.now());
  }

  async resumeTimer(userId: string): Promise<ActiveTimerDto> {
    const timer = await this.getTimerRowOrThrow(userId);
    if (timer.status === 'RUNNING') {
      return toActiveTimer(timer, Date.now());
    }
    const updated = await this.prisma.activeTimer.update({
      where: { userId },
      data: { status: 'RUNNING', lastStartedAt: new Date() },
      include: TIMER_INCLUDE,
    });
    return toActiveTimer(updated, Date.now());
  }

  async stopTimer(actor: AuthUser, ctx: ClientContext): Promise<TimeLogDto | null> {
    const timer = await this.getTimerRowOrThrow(actor.id);
    return this.commit(timer, actor, ctx);
  }

  private async commit(
    timer: TimerRow,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<TimeLogDto | null> {
    const now = new Date();
    const seconds = computeElapsedSeconds(
      timer.accumulatedSeconds,
      timer.status,
      timer.lastStartedAt ? timer.lastStartedAt.getTime() : null,
      now.getTime(),
    );

    const log = await this.prisma.$transaction(async (tx) => {
      let created: TimeLogRow | null = null;
      if (seconds > 0) {
        created = (await tx.timeLog.create({
          data: {
            workItemId: timer.workItemId,
            userId: timer.userId,
            seconds,
            source: 'TIMER',
            spentOn: dateOnly(now),
            startedAt: timer.startedAt,
            endedAt: now,
            description: timer.description,
          },
          include: TIME_LOG_INCLUDE,
        })) as TimeLogRow;
      }
      await tx.activeTimer.delete({ where: { id: timer.id } });
      return created;
    });

    if (log) {
      await this.audit.record({
        action: 'time.logged',
        entityType: 'WorkItem',
        entityId: timer.workItemId,
        actor,
        metadata: { seconds, source: 'TIMER' },
        ...ctx,
      });
      return toTimeLog(log);
    }
    return null;
  }

  // --- Manual logs ------------------------------------------------------------

  async createManualLog(
    actor: AuthUser,
    input: CreateTimeLogInput,
    ctx: ClientContext,
  ): Promise<TimeLogDto> {
    await this.assertWorkItemExists(input.workItemId);
    const spentOn = input.spentOn ? dateOnly(new Date(input.spentOn)) : dateOnly(new Date());
    const log = await this.prisma.timeLog.create({
      data: {
        workItemId: input.workItemId,
        userId: actor.id,
        seconds: input.minutes * 60,
        source: 'MANUAL',
        spentOn,
        description: input.description ?? null,
      },
      include: TIME_LOG_INCLUDE,
    });
    await this.audit.record({
      action: 'time.logged',
      entityType: 'WorkItem',
      entityId: input.workItemId,
      actor,
      metadata: { seconds: input.minutes * 60, source: 'MANUAL' },
      ...ctx,
    });
    return toTimeLog(log);
  }

  async list(query: ListTimeLogsQuery, actor: AuthUser): Promise<Paginated<TimeLogDto>> {
    const where: Prisma.TimeLogWhereInput = {
      ...(query.workItemId ? { workItemId: query.workItemId } : {}),
      ...(query.mine ? { userId: actor.id } : query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            spentOn: {
              ...(query.from ? { gte: dateOnly(new Date(query.from)) } : {}),
              ...(query.to ? { lte: dateOnly(new Date(query.to)) } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.timeLog.count({ where }),
      this.prisma.timeLog.findMany({
        where,
        include: TIME_LOG_INCLUDE,
        orderBy: [{ spentOn: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { data: rows.map(toTimeLog), meta: buildPageMeta(query.page, query.pageSize, total) };
  }

  async updateLog(
    id: string,
    input: UpdateTimeLogInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<TimeLogDto> {
    const log = await this.getLogOrThrow(id);
    if (log.userId !== actor.id) {
      throw new ForbiddenException('You can only edit your own time logs');
    }
    const data: Prisma.TimeLogUpdateInput = {};
    if (input.minutes !== undefined) data.seconds = input.minutes * 60;
    if (input.description !== undefined) data.description = input.description;
    if (input.spentOn !== undefined) data.spentOn = dateOnly(new Date(input.spentOn));

    const updated = await this.prisma.timeLog.update({
      where: { id },
      data,
      include: TIME_LOG_INCLUDE,
    });
    await this.audit.record({
      action: 'time.updated',
      entityType: 'TimeLog',
      entityId: id,
      actor,
      ...ctx,
    });
    return toTimeLog(updated);
  }

  async deleteLog(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const log = await this.getLogOrThrow(id);
    if (log.userId !== actor.id) {
      throw new ForbiddenException('You can only delete your own time logs');
    }
    await this.prisma.timeLog.delete({ where: { id } });
    await this.audit.record({
      action: 'time.deleted',
      entityType: 'TimeLog',
      entityId: id,
      actor,
      ...ctx,
    });
    return { success: true };
  }

  async getWorkItemTotal(workItemId: string): Promise<{ seconds: number }> {
    const result = await this.prisma.timeLog.aggregate({
      where: { workItemId },
      _sum: { seconds: true },
    });
    return { seconds: result._sum.seconds ?? 0 };
  }

  // --- Personal summary -------------------------------------------------------

  async getSummary(userId: string): Promise<TimeSummary> {
    const now = new Date();
    const today = dateOnly(now);
    const weekStart = startOfWeek(now);

    const [timer, weekLogs, grouped, recent] = await Promise.all([
      this.getActiveTimer(userId),
      this.prisma.timeLog.findMany({
        where: { userId, spentOn: { gte: weekStart } },
        select: { seconds: true, spentOn: true },
      }),
      this.prisma.workItem.groupBy({
        by: ['status'],
        where: { assigneeId: userId },
        _count: { _all: true },
      }),
      this.prisma.timeLog.findMany({
        where: { userId },
        include: TIME_LOG_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    let todaySeconds = 0;
    let weekSeconds = 0;
    const perDay = new Map<number, number>();
    for (const log of weekLogs) {
      weekSeconds += log.seconds;
      const key = log.spentOn.getTime();
      perDay.set(key, (perDay.get(key) ?? 0) + log.seconds);
      if (key === today.getTime()) todaySeconds += log.seconds;
    }

    const weekByDay = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setUTCDate(day.getUTCDate() + i);
      return { date: day.toISOString(), seconds: perDay.get(day.getTime()) ?? 0 };
    });

    const assignedByStatus = WORK_ITEM_STATUSES.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<WorkItemStatus, number>,
    );
    let assignedOpenCount = 0;
    for (const group of grouped) {
      const status = group.status as WorkItemStatus;
      assignedByStatus[status] = group._count._all;
      if (status !== 'DONE' && status !== 'CANCELLED') assignedOpenCount += group._count._all;
    }

    return {
      activeTimer: timer,
      todaySeconds,
      weekSeconds,
      assignedByStatus,
      assignedOpenCount,
      weekByDay,
      recentLogs: recent.map(toTimeLog),
    };
  }

  // --- internals --------------------------------------------------------------

  private async getTimerRowOrThrow(userId: string): Promise<TimerRow> {
    const row = await this.prisma.activeTimer.findUnique({
      where: { userId },
      include: TIMER_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('No active timer');
    }
    return row;
  }

  private async getLogOrThrow(id: string) {
    const log = await this.prisma.timeLog.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!log) {
      throw new NotFoundException('Time log not found');
    }
    return log;
  }

  private async assertWorkItemExists(id: string): Promise<void> {
    const found = await this.prisma.workItem.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new BadRequestException('Work item not found');
    }
  }
}
