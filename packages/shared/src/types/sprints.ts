import type { SprintStatus } from '../domain/sprints';
import type { WorkItemStatus } from '../domain/work-items';
import type { UserRef, WorkItemSummary } from './work-items';

export interface SprintDto {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  wipLimits: Record<string, number> | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  status: WorkItemStatus;
  wipLimit: number | null;
  items: WorkItemSummary[];
}

export interface BoardDto {
  sprint: SprintDto;
  columns: BoardColumn[];
}

export interface AssigneeLoad {
  assignee: UserRef | null;
  itemCount: number;
  points: number;
  completedPoints: number;
  capacityHours: number;
}

export interface SprintAnalytics {
  sprintId: string;
  itemCount: number;
  completedCount: number;
  countsByStatus: Record<WorkItemStatus, number>;
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  workingDays: number;
  daysElapsed: number;
  daysRemaining: number;
  perAssignee: AssigneeLoad[];
}
