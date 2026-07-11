import type { TimeLogSource, TimerStatus } from '../domain/time';
import type { WorkItemStatus } from '../domain/work-items';
import type { UserRef } from './work-items';

export interface WorkItemTag {
  id: string;
  key: string;
  title: string;
}

export interface TimeLogDto {
  id: string;
  workItemId: string;
  workItem: WorkItemTag | null;
  user: UserRef | null;
  seconds: number;
  description: string | null;
  source: TimeLogSource;
  spentOn: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface ActiveTimerDto {
  id: string;
  status: TimerStatus;
  elapsedSeconds: number;
  startedAt: string;
  description: string | null;
  workItem: WorkItemTag;
}

export interface DayTotal {
  date: string;
  seconds: number;
}

export interface TimeSummary {
  activeTimer: ActiveTimerDto | null;
  todaySeconds: number;
  weekSeconds: number;
  assignedByStatus: Record<WorkItemStatus, number>;
  assignedOpenCount: number;
  weekByDay: DayTotal[];
  recentLogs: TimeLogDto[];
}
