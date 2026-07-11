import { Prisma } from '@eop/database';
import type { SprintDto, SprintStatus } from '@eop/shared';

export const SPRINT_COUNT_INCLUDE = {
  _count: { select: { workItems: true } },
} satisfies Prisma.SprintInclude;

export type SprintRow = Prisma.SprintGetPayload<{ include: typeof SPRINT_COUNT_INCLUDE }>;

export function toSprintDto(row: SprintRow): SprintDto {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    status: row.status as SprintStatus,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    wipLimits: (row.wipLimits as Record<string, number> | null) ?? null,
    itemCount: row._count.workItems,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
