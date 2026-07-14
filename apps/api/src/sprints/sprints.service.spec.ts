import { businessDaysBetween } from '@eop/shared';
import { SprintsService } from './sprints.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';
import type { NotificationsService } from '../notifications/notifications.service';

function makeService() {
  const prisma = {
    sprint: { findUnique: jest.fn() },
    workItem: { findMany: jest.fn() },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emitBoardChanged: jest.fn(), emitSprintsChanged: jest.fn() };
  const notifications = { emit: jest.fn(), emitToMany: jest.fn() };
  const service = new SprintsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    realtime as unknown as RealtimeService,
    notifications as unknown as NotificationsService,
  );
  return { service, prisma };
}

describe('businessDaysBetween', () => {
  it('counts weekdays inclusively', () => {
    expect(businessDaysBetween(new Date('2026-01-05'), new Date('2026-01-09'))).toBe(5); // Mon–Fri
    expect(businessDaysBetween(new Date('2026-01-05'), new Date('2026-01-11'))).toBe(5); // + weekend
    expect(businessDaysBetween(new Date('2026-01-10'), new Date('2026-01-10'))).toBe(0); // Saturday
  });
});

describe('SprintsService.getAnalytics', () => {
  it('aggregates points, status counts and per-assignee capacity', async () => {
    const { service, prisma } = makeService();
    prisma.sprint.findUnique.mockResolvedValue({
      id: 's1',
      name: 'Sprint 1',
      goal: null,
      status: 'ACTIVE',
      startDate: new Date('2026-01-05'),
      endDate: new Date('2026-01-09'),
      wipLimits: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      _count: { workItems: 3 },
    });

    const u1 = {
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@eop.dev',
      avatarUrl: null,
      capacityHoursPerDay: 6,
    };
    prisma.workItem.findMany.mockResolvedValue([
      { status: 'DONE', storyPoints: 3, assigneeId: 'u1', assignee: u1 },
      { status: 'IN_PROGRESS', storyPoints: 5, assigneeId: 'u1', assignee: u1 },
      { status: 'TODO', storyPoints: 2, assigneeId: null, assignee: null },
    ]);

    const analytics = await service.getAnalytics('s1');

    expect(analytics.workingDays).toBe(5);
    expect(analytics.itemCount).toBe(3);
    expect(analytics.completedCount).toBe(1);
    expect(analytics.totalPoints).toBe(10);
    expect(analytics.completedPoints).toBe(3);
    expect(analytics.remainingPoints).toBe(7);
    expect(analytics.countsByStatus.DONE).toBe(1);
    expect(analytics.countsByStatus.IN_PROGRESS).toBe(1);
    expect(analytics.countsByStatus.TODO).toBe(1);

    const ada = analytics.perAssignee.find((a) => a.assignee?.id === 'u1');
    expect(ada?.points).toBe(8);
    expect(ada?.completedPoints).toBe(3);
    expect(ada?.capacityHours).toBe(30); // 5 working days × 6h

    const unassigned = analytics.perAssignee.find((a) => a.assignee === null);
    expect(unassigned?.points).toBe(2);
  });
});

describe('SprintsService.getBurndown', () => {
  it('builds an ideal line and actual remaining points', async () => {
    const { service, prisma } = makeService();
    prisma.sprint.findUnique.mockResolvedValue({
      id: 's1',
      name: 'Sprint 1',
      goal: null,
      status: 'ACTIVE',
      startDate: new Date('2026-02-02'),
      endDate: new Date('2026-02-04'),
      wipLimits: null,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
      _count: { workItems: 2 },
    });
    prisma.workItem.findMany.mockResolvedValue([
      { storyPoints: 5, status: 'DONE', completedAt: new Date('2026-02-03') },
      { storyPoints: 5, status: 'TODO', completedAt: null },
    ]);

    const burndown = await service.getBurndown('s1');

    expect(burndown.totalPoints).toBe(10);
    expect(burndown.points).toHaveLength(3);
    expect(burndown.points[0].ideal).toBe(10);
    expect(burndown.points[2].ideal).toBe(0);
    // Day 0: nothing completed yet; Day 1+: the 5-point item is done.
    expect(burndown.points[0].remaining).toBe(10);
    expect(burndown.points[1].remaining).toBe(5);
  });
});
