import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  BOARD_COLUMN_STATUSES,
  buildPageMeta,
  businessDaysBetween,
  WORK_ITEM_STATUSES,
  type AssigneeLoad,
  type AuthUser,
  type BoardDto,
  type BurndownPoint,
  type CreateSprintInput,
  type ListSprintsQuery,
  type Paginated,
  type SprintAnalytics,
  type SprintBurndown,
  type SprintDto,
  type SprintStatus,
  type UpdateSprintInput,
  type WorkItemStatus,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { ClientContext } from '../common/utils/request-context';
import { SUMMARY_INCLUDE, toSummary, toUserRef } from '../work-items/work-items.mapper';
import { SPRINT_COUNT_INCLUDE, toSprintDto, type SprintRow } from './sprints.mapper';

const toJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateSprintInput, actor: AuthUser, ctx: ClientContext): Promise<SprintDto> {
    const row = await this.prisma.sprint.create({
      data: {
        name: input.name,
        goal: input.goal ?? null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        wipLimits: input.wipLimits ? (input.wipLimits as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: SPRINT_COUNT_INCLUDE,
    });
    await this.audit.record({
      action: 'sprint.created',
      entityType: 'Sprint',
      entityId: row.id,
      actor,
      after: { name: row.name },
      ...ctx,
    });
    this.realtime.emitSprintsChanged();
    return toSprintDto(row);
  }

  async list(query: ListSprintsQuery): Promise<Paginated<SprintDto>> {
    const where: Prisma.SprintWhereInput = query.status ? { status: query.status } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.sprint.count({ where }),
      this.prisma.sprint.findMany({
        where,
        include: SPRINT_COUNT_INCLUDE,
        orderBy: { startDate: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { data: rows.map(toSprintDto), meta: buildPageMeta(query.page, query.pageSize, total) };
  }

  async findById(id: string): Promise<SprintDto> {
    return toSprintDto(await this.getRowOrThrow(id));
  }

  async update(
    id: string,
    input: UpdateSprintInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<SprintDto> {
    await this.getRowOrThrow(id);
    const data: Prisma.SprintUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.goal !== undefined) data.goal = input.goal;
    if (input.status !== undefined) data.status = input.status;
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) data.endDate = new Date(input.endDate);
    if (input.wipLimits !== undefined) data.wipLimits = toJson(input.wipLimits);

    const row = await this.prisma.sprint.update({
      where: { id },
      data,
      include: SPRINT_COUNT_INCLUDE,
    });
    await this.audit.record({
      action: 'sprint.updated',
      entityType: 'Sprint',
      entityId: id,
      actor,
      ...ctx,
    });
    this.realtime.emitSprintsChanged();
    this.realtime.emitBoardChanged(id, 'sprint_updated');
    return toSprintDto(row);
  }

  async setStatus(
    id: string,
    status: SprintStatus,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<SprintDto> {
    await this.getRowOrThrow(id);
    const row = await this.prisma.sprint.update({
      where: { id },
      data: { status },
      include: SPRINT_COUNT_INCLUDE,
    });
    await this.audit.record({
      action: 'sprint.status_changed',
      entityType: 'Sprint',
      entityId: id,
      actor,
      after: { status },
      ...ctx,
    });
    this.realtime.emitSprintsChanged();
    this.realtime.emitBoardChanged(id, 'sprint_status');
    if (status === 'ACTIVE' || status === 'COMPLETED') {
      await this.notifySprintParticipants(id, row.name, status, actor.id);
    }
    return toSprintDto(row);
  }

  /** Notify everyone with an assigned item in the sprint that it started/completed. */
  private async notifySprintParticipants(
    sprintId: string,
    sprintName: string,
    status: 'ACTIVE' | 'COMPLETED',
    actorId: string,
  ): Promise<void> {
    const rows = await this.prisma.workItem.findMany({
      where: { sprintId, assigneeId: { not: null } },
      select: { assigneeId: true },
      distinct: ['assigneeId'],
    });
    const started = status === 'ACTIVE';
    await this.notifications.emitToMany(
      rows.map((r) => r.assigneeId),
      {
        type: started ? 'SPRINT_STARTED' : 'SPRINT_COMPLETED',
        title: started ? `Sprint "${sprintName}" started` : `Sprint "${sprintName}" completed`,
        body: started
          ? 'A sprint you have work in has started.'
          : 'A sprint you have work in has been completed.',
        link: `/sprints/${sprintId}`,
        entityType: 'Sprint',
        entityId: sprintId,
        actorId,
      },
    );
  }

  async remove(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const row = await this.getRowOrThrow(id);
    await this.prisma.sprint.delete({ where: { id } });
    await this.audit.record({
      action: 'sprint.deleted',
      entityType: 'Sprint',
      entityId: id,
      actor,
      before: { name: row.name },
      ...ctx,
    });
    this.realtime.emitSprintsChanged();
    return { success: true };
  }

  async addItems(
    id: string,
    itemIds: string[],
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<BoardDto> {
    await this.getRowOrThrow(id);
    const items = await this.prisma.workItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, status: true, sprintId: true },
    });
    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException('One or more work items are invalid');
    }

    const base = Date.now();
    await this.prisma.$transaction(
      items.map((item, index) =>
        this.prisma.workItem.update({
          where: { id: item.id },
          data: {
            sprintId: id,
            rank: base + index,
            status: item.status === 'BACKLOG' ? 'TODO' : item.status,
          },
        }),
      ),
    );

    const affected = new Set<string>([id]);
    for (const item of items) if (item.sprintId) affected.add(item.sprintId);
    affected.forEach((sprintId) => this.realtime.emitBoardChanged(sprintId, 'items_added'));

    await this.audit.record({
      action: 'sprint.items_added',
      entityType: 'Sprint',
      entityId: id,
      actor,
      metadata: { count: items.length },
      ...ctx,
    });
    return this.getBoard(id);
  }

  async removeItems(
    id: string,
    itemIds: string[],
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<BoardDto> {
    await this.getRowOrThrow(id);
    const result = await this.prisma.workItem.updateMany({
      where: { id: { in: itemIds }, sprintId: id },
      data: { sprintId: null },
    });
    this.realtime.emitBoardChanged(id, 'items_removed');
    await this.audit.record({
      action: 'sprint.items_removed',
      entityType: 'Sprint',
      entityId: id,
      actor,
      metadata: { count: result.count },
      ...ctx,
    });
    return this.getBoard(id);
  }

  async getBoard(id: string): Promise<BoardDto> {
    const sprint = await this.getRowOrThrow(id);
    const rows = await this.prisma.workItem.findMany({
      where: { sprintId: id, status: { in: BOARD_COLUMN_STATUSES } },
      include: SUMMARY_INCLUDE,
      orderBy: { rank: 'asc' },
    });
    const wip = (sprint.wipLimits as Record<string, number> | null) ?? null;
    const columns = BOARD_COLUMN_STATUSES.map((status) => ({
      status,
      wipLimit: wip?.[status] ?? null,
      items: rows.filter((r) => r.status === status).map(toSummary),
    }));
    return { sprint: toSprintDto(sprint), columns };
  }

  async getAnalytics(id: string): Promise<SprintAnalytics> {
    const sprint = await this.getRowOrThrow(id);
    const items = await this.prisma.workItem.findMany({
      where: { sprintId: id },
      select: {
        status: true,
        storyPoints: true,
        assigneeId: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            capacityHoursPerDay: true,
          },
        },
      },
    });

    const workingDays = businessDaysBetween(sprint.startDate, sprint.endDate);
    const today = new Date();
    const elapsedEnd = today > sprint.endDate ? sprint.endDate : today;
    const daysElapsed = today < sprint.startDate ? 0 : businessDaysBetween(sprint.startDate, elapsedEnd);
    const daysRemaining = Math.max(0, workingDays - daysElapsed);

    const countsByStatus = WORK_ITEM_STATUSES.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<WorkItemStatus, number>,
    );

    let totalPoints = 0;
    let completedPoints = 0;
    let completedCount = 0;
    const groups = new Map<string, AssigneeLoad>();

    for (const item of items) {
      countsByStatus[item.status as WorkItemStatus] += 1;
      const points = item.storyPoints ?? 0;
      const done = item.status === 'DONE';
      totalPoints += points;
      if (done) {
        completedPoints += points;
        completedCount += 1;
      }

      const key = item.assigneeId ?? '__unassigned__';
      const existing =
        groups.get(key) ??
        ({
          assignee: toUserRef(item.assignee),
          itemCount: 0,
          points: 0,
          completedPoints: 0,
          capacityHours: workingDays * (item.assignee?.capacityHoursPerDay ?? 0),
        } satisfies AssigneeLoad);
      existing.itemCount += 1;
      existing.points += points;
      if (done) existing.completedPoints += points;
      groups.set(key, existing);
    }

    return {
      sprintId: id,
      itemCount: items.length,
      completedCount,
      countsByStatus,
      totalPoints,
      completedPoints,
      remainingPoints: totalPoints - completedPoints,
      workingDays,
      daysElapsed,
      daysRemaining,
      perAssignee: [...groups.values()].sort((a, b) => b.points - a.points),
    };
  }

  async getBurndown(id: string): Promise<SprintBurndown> {
    const sprint = await this.getRowOrThrow(id);
    const items = await this.prisma.workItem.findMany({
      where: { sprintId: id },
      select: { storyPoints: true, status: true, completedAt: true },
    });
    const totalPoints = items.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    const dayOnly = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const DAY = 86_400_000;
    const startMs = dayOnly(sprint.startDate).getTime();
    const endMs = dayOnly(sprint.endDate).getTime();
    const todayMs = dayOnly(new Date()).getTime();
    const dayCount = Math.min(367, Math.max(1, Math.round((endMs - startMs) / DAY) + 1));
    const denom = Math.max(1, dayCount - 1);

    const points: BurndownPoint[] = [];
    for (let i = 0; i < dayCount; i += 1) {
      const dayStart = startMs + i * DAY;
      const nextDay = dayStart + DAY;
      const ideal = Math.round(totalPoints * (1 - i / denom) * 10) / 10;
      let remaining: number | null = null;
      if (dayStart <= todayMs) {
        const done = items
          .filter((it) => it.status === 'DONE' && it.completedAt && it.completedAt.getTime() < nextDay)
          .reduce((sum, it) => sum + (it.storyPoints ?? 0), 0);
        remaining = totalPoints - done;
      }
      points.push({ date: new Date(dayStart).toISOString(), ideal, remaining });
    }

    return { sprintId: id, totalPoints, points };
  }

  private async getRowOrThrow(id: string): Promise<SprintRow> {
    const row = await this.prisma.sprint.findUnique({ where: { id }, include: SPRINT_COUNT_INCLUDE });
    if (!row) {
      throw new NotFoundException('Sprint not found');
    }
    return row;
  }
}
