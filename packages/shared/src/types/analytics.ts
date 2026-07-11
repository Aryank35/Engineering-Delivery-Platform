import type { WorkItemStatus, WorkItemType } from '../domain/work-items';
import type { UserRef } from './work-items';

export interface StatusCount {
  status: WorkItemStatus;
  count: number;
}

export interface ThroughputPoint {
  weekStart: string;
  completed: number;
}

export interface CycleTimeByType {
  type: WorkItemType;
  avgDays: number;
  count: number;
}

export interface CycleTimeStats {
  avgDays: number;
  medianDays: number;
  sampleSize: number;
  byType: CycleTimeByType[];
}

export interface WorkloadRow {
  assignee: UserRef | null;
  open: number;
  points: number;
}

export interface TimeByUserRow {
  user: UserRef | null;
  seconds: number;
}

export interface AnalyticsOverview {
  totalOpen: number;
  completedThisWeek: number;
  statusDistribution: StatusCount[];
  throughput: ThroughputPoint[];
  cycleTime: CycleTimeStats;
  workload: WorkloadRow[];
  timeByUser: TimeByUserRow[];
}

export interface VelocityPoint {
  sprintId: string;
  name: string;
  committedPoints: number;
  completedPoints: number;
}

export interface DefectWeekPoint {
  weekStart: string;
  created: number;
  resolved: number;
}

export interface QaAnalytics {
  inQaCount: number;
  inReviewCount: number;
  defectsOpen: number;
  defectsResolved: number;
  defectsByStatus: StatusCount[];
  defectsByWeek: DefectWeekPoint[];
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  remaining: number | null;
}

export interface SprintBurndown {
  sprintId: string;
  totalPoints: number;
  points: BurndownPoint[];
}
