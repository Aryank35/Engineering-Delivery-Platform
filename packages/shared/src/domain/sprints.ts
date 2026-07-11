import type { WorkItemStatus } from './work-items';

export const SPRINT_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const SPRINT_STATUS_META: Record<SprintStatus, { label: string }> = {
  PLANNED: { label: 'Planned' },
  ACTIVE: { label: 'Active' },
  COMPLETED: { label: 'Completed' },
};

/** Statuses shown as board columns, left → right. Backlog/Cancelled are off-board. */
export const BOARD_COLUMN_STATUSES: WorkItemStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'IN_QA',
  'DONE',
];

/** Inclusive count of weekdays (Mon–Fri) between two dates. */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // Guard against pathological ranges.
  let guard = 0;
  while (cursor <= last && guard < 3660) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return count;
}
