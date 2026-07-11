import { Injectable } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  startOfWeek,
  WORK_ITEM_STATUSES,
  type AnalyticsOverview,
  type CycleTimeByType,
  type QaAnalytics,
  type StatusCount,
  type UserRef,
  type VelocityPoint,
  type WorkItemStatus,
  type WorkItemType,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { USER_REF_SELECT, toUserRef } from '../work-items/work-items.mapper';

const OPEN_STATUSES: WorkItemStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'IN_QA',
];
const DAY_MS = 86_400_000;
const round1 = (n: number): number => Math.round(n * 10) / 10;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<AnalyticsOverview> {
    const weekStart = startOfWeek(new Date());
    const [statusGroups, totalOpen, completedThisWeek, cycleTime, throughput, workload, timeByUser] =
      await Promise.all([
        this.prisma.workItem.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.workItem.count({ where: { status: { in: OPEN_STATUSES } } }),
        this.prisma.workItem.count({ where: { completedAt: { gte: weekStart } } }),
        this.computeCycleTime(),
        this.computeThroughput(),
        this.computeWorkload(),
        this.computeTimeByUser(weekStart),
      ]);

    const statusMap = new Map(statusGroups.map((g) => [g.status as WorkItemStatus, g._count._all]));
    const statusDistribution: StatusCount[] = WORK_ITEM_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    }));

    return {
      totalOpen,
      completedThisWeek,
      statusDistribution,
      throughput,
      cycleTime,
      workload,
      timeByUser,
    };
  }

  async getVelocity(): Promise<VelocityPoint[]> {
    const sprints = await this.prisma.sprint.findMany({
      orderBy: { startDate: 'desc' },
      take: 8,
      select: { id: true, name: true },
    });
    if (sprints.length === 0) return [];
    const ids = sprints.map((s) => s.id);

    const [committed, completed] = await Promise.all([
      this.prisma.workItem.groupBy({
        by: ['sprintId'],
        where: { sprintId: { in: ids } },
        _sum: { storyPoints: true },
      }),
      this.prisma.workItem.groupBy({
        by: ['sprintId'],
        where: { sprintId: { in: ids }, status: 'DONE' },
        _sum: { storyPoints: true },
      }),
    ]);
    const committedMap = new Map(committed.map((g) => [g.sprintId, g._sum.storyPoints ?? 0]));
    const completedMap = new Map(completed.map((g) => [g.sprintId, g._sum.storyPoints ?? 0]));

    return sprints
      .reverse()
      .map((s) => ({
        sprintId: s.id,
        name: s.name,
        committedPoints: committedMap.get(s.id) ?? 0,
        completedPoints: completedMap.get(s.id) ?? 0,
      }));
  }

  async getQa(): Promise<QaAnalytics> {
    const bugWhere: Prisma.WorkItemWhereInput = { labels: { some: { label: { name: 'Bug' } } } };
    const weeks = this.lastNWeeks(8);

    const [inQaCount, inReviewCount, defectsOpen, defectsResolved, defectStatusGroups, bugItems] =
      await Promise.all([
        this.prisma.workItem.count({ where: { status: 'IN_QA' } }),
        this.prisma.workItem.count({ where: { status: 'IN_REVIEW' } }),
        this.prisma.workItem.count({ where: { ...bugWhere, status: { in: OPEN_STATUSES } } }),
        this.prisma.workItem.count({ where: { ...bugWhere, status: 'DONE' } }),
        this.prisma.workItem.groupBy({ by: ['status'], where: bugWhere, _count: { _all: true } }),
        this.prisma.workItem.findMany({
          where: {
            ...bugWhere,
            OR: [{ createdAt: { gte: weeks[0] } }, { completedAt: { gte: weeks[0] } }],
          },
          select: { createdAt: true, completedAt: true, status: true },
        }),
      ]);

    const statusMap = new Map(
      defectStatusGroups.map((g) => [g.status as WorkItemStatus, g._count._all]),
    );
    const defectsByStatus: StatusCount[] = WORK_ITEM_STATUSES.map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    })).filter((s) => s.count > 0);

    const byWeek = weeks.map((weekStart) => ({
      weekStart: weekStart.toISOString(),
      created: 0,
      resolved: 0,
    }));
    for (const bug of bugItems) {
      const createdIdx = this.weekIndex(weeks, bug.createdAt);
      if (createdIdx >= 0) byWeek[createdIdx].created += 1;
      if (bug.status === 'DONE' && bug.completedAt) {
        const resolvedIdx = this.weekIndex(weeks, bug.completedAt);
        if (resolvedIdx >= 0) byWeek[resolvedIdx].resolved += 1;
      }
    }

    return { inQaCount, inReviewCount, defectsOpen, defectsResolved, defectsByStatus, defectsByWeek: byWeek };
  }

  // --- internals --------------------------------------------------------------

  private async computeCycleTime() {
    const windowStart = new Date(Date.now() - 60 * DAY_MS);
    const completed = await this.prisma.workItem.findMany({
      where: { status: 'DONE', completedAt: { gte: windowStart } },
      select: { id: true, type: true, createdAt: true, completedAt: true },
    });
    if (completed.length === 0) {
      return { avgDays: 0, medianDays: 0, sampleSize: 0, byType: [] };
    }

    const starts = await this.prisma.workItemActivity.findMany({
      where: {
        workItemId: { in: completed.map((c) => c.id) },
        field: 'status',
        data: { path: ['to'], equals: 'IN_PROGRESS' },
      },
      select: { workItemId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const firstInProgress = new Map<string, Date>();
    for (const activity of starts) {
      if (!firstInProgress.has(activity.workItemId)) {
        firstInProgress.set(activity.workItemId, activity.createdAt);
      }
    }

    const perType = new Map<WorkItemType, number[]>();
    const allDays: number[] = [];
    for (const item of completed) {
      if (!item.completedAt) continue;
      const start = firstInProgress.get(item.id) ?? item.createdAt;
      const days = Math.max(0, (item.completedAt.getTime() - start.getTime()) / DAY_MS);
      allDays.push(days);
      const list = perType.get(item.type as WorkItemType) ?? [];
      list.push(days);
      perType.set(item.type as WorkItemType, list);
    }

    const byType: CycleTimeByType[] = [...perType.entries()].map(([type, days]) => ({
      type,
      avgDays: round1(days.reduce((a, b) => a + b, 0) / days.length),
      count: days.length,
    }));

    return {
      avgDays: round1(allDays.reduce((a, b) => a + b, 0) / allDays.length),
      medianDays: round1(this.median(allDays)),
      sampleSize: allDays.length,
      byType,
    };
  }

  private async computeThroughput() {
    const weeks = this.lastNWeeks(8);
    const rows = await this.prisma.workItem.findMany({
      where: { completedAt: { gte: weeks[0] } },
      select: { completedAt: true },
    });
    const buckets = weeks.map((weekStart) => ({ weekStart: weekStart.toISOString(), completed: 0 }));
    for (const row of rows) {
      if (!row.completedAt) continue;
      const idx = this.weekIndex(weeks, row.completedAt);
      if (idx >= 0) buckets[idx].completed += 1;
    }
    return buckets;
  }

  private async computeWorkload() {
    const groups = await this.prisma.workItem.groupBy({
      by: ['assigneeId'],
      where: { status: { in: OPEN_STATUSES } },
      _count: { _all: true },
      _sum: { storyPoints: true },
    });
    const userRefs = await this.userRefMap(
      groups.map((g) => g.assigneeId).filter((id): id is string => Boolean(id)),
    );
    return groups
      .map((g) => ({
        assignee: g.assigneeId ? (userRefs.get(g.assigneeId) ?? null) : null,
        open: g._count._all,
        points: g._sum.storyPoints ?? 0,
      }))
      .sort((a, b) => b.open - a.open)
      .slice(0, 8);
  }

  private async computeTimeByUser(weekStart: Date) {
    const groups = await this.prisma.timeLog.groupBy({
      by: ['userId'],
      where: { spentOn: { gte: weekStart } },
      _sum: { seconds: true },
    });
    const userRefs = await this.userRefMap(groups.map((g) => g.userId));
    return groups
      .map((g) => ({ user: userRefs.get(g.userId) ?? null, seconds: g._sum.seconds ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8);
  }

  private async userRefMap(ids: string[]): Promise<Map<string, UserRef>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: USER_REF_SELECT,
    });
    const map = new Map<string, UserRef>();
    for (const user of users) {
      const ref = toUserRef(user);
      if (ref) map.set(user.id, ref);
    }
    return map;
  }

  private lastNWeeks(n: number): Date[] {
    const thisWeek = startOfWeek(new Date());
    const weeks: Date[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(thisWeek);
      d.setUTCDate(d.getUTCDate() - i * 7);
      weeks.push(d);
    }
    return weeks;
  }

  private weekIndex(weeks: Date[], date: Date): number {
    const ws = startOfWeek(date).getTime();
    return weeks.findIndex((w) => w.getTime() === ws);
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
}
