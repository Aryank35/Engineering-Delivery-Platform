import { AnalyticsService } from './analytics.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeService() {
  const prisma = {
    sprint: { findMany: jest.fn() },
    workItem: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    workItemActivity: { findMany: jest.fn() },
    timeLog: { groupBy: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const service = new AnalyticsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('AnalyticsService.getVelocity', () => {
  it('maps committed vs completed points per sprint, chronologically', async () => {
    const { service, prisma } = makeService();
    // Returned newest-first; the service reverses to chronological order.
    prisma.sprint.findMany.mockResolvedValue([
      { id: 's2', name: 'Sprint 2' },
      { id: 's1', name: 'Sprint 1' },
    ]);
    prisma.workItem.groupBy
      .mockResolvedValueOnce([
        { sprintId: 's1', _sum: { storyPoints: 10 } },
        { sprintId: 's2', _sum: { storyPoints: 8 } },
      ])
      .mockResolvedValueOnce([{ sprintId: 's1', _sum: { storyPoints: 6 } }]);

    const velocity = await service.getVelocity();

    expect(velocity).toEqual([
      { sprintId: 's1', name: 'Sprint 1', committedPoints: 10, completedPoints: 6 },
      { sprintId: 's2', name: 'Sprint 2', committedPoints: 8, completedPoints: 0 },
    ]);
  });

  it('returns empty when there are no sprints', async () => {
    const { service, prisma } = makeService();
    prisma.sprint.findMany.mockResolvedValue([]);
    await expect(service.getVelocity()).resolves.toEqual([]);
  });
});
