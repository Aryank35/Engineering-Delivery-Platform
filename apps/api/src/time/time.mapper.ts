import { Prisma } from '@eop/database';
import {
  computeElapsedSeconds,
  workItemKey,
  type ActiveTimerDto,
  type TimeLogDto,
  type TimeLogSource,
  type TimerStatus,
} from '@eop/shared';
import { USER_REF_SELECT, toUserRef } from '../work-items/work-items.mapper';

const WORK_ITEM_TAG_SELECT = { id: true, number: true, title: true } satisfies Prisma.WorkItemSelect;

export const TIME_LOG_INCLUDE = {
  user: { select: USER_REF_SELECT },
  workItem: { select: WORK_ITEM_TAG_SELECT },
} satisfies Prisma.TimeLogInclude;

export const TIMER_INCLUDE = {
  workItem: { select: WORK_ITEM_TAG_SELECT },
} satisfies Prisma.ActiveTimerInclude;

export type TimeLogRow = Prisma.TimeLogGetPayload<{ include: typeof TIME_LOG_INCLUDE }>;
export type TimerRow = Prisma.ActiveTimerGetPayload<{ include: typeof TIMER_INCLUDE }>;

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

export function toTimeLog(row: TimeLogRow): TimeLogDto {
  return {
    id: row.id,
    workItemId: row.workItemId,
    workItem: row.workItem
      ? { id: row.workItem.id, key: workItemKey(row.workItem.number), title: row.workItem.title }
      : null,
    user: toUserRef(row.user),
    seconds: row.seconds,
    description: row.description,
    source: row.source as TimeLogSource,
    spentOn: row.spentOn.toISOString(),
    startedAt: iso(row.startedAt),
    endedAt: iso(row.endedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toActiveTimer(row: TimerRow, nowMs: number): ActiveTimerDto {
  return {
    id: row.id,
    status: row.status as TimerStatus,
    elapsedSeconds: computeElapsedSeconds(
      row.accumulatedSeconds,
      row.status as TimerStatus,
      row.lastStartedAt ? row.lastStartedAt.getTime() : null,
      nowMs,
    ),
    startedAt: row.startedAt.toISOString(),
    description: row.description,
    workItem: {
      id: row.workItem.id,
      key: workItemKey(row.workItem.number),
      title: row.workItem.title,
    },
  };
}
