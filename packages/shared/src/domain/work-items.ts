/**
 * Work-item domain vocabulary. Values mirror the Prisma enums exactly so the
 * same strings flow through API, database and web.
 */

export const WORK_ITEM_TYPES = ['REQUIREMENT', 'EPIC', 'STORY', 'TASK'] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_STATUSES = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'IN_QA',
  'DONE',
  'CANCELLED',
] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ACTIVITY_TYPES = ['CREATED', 'FIELD_CHANGED'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// --- Type metadata ----------------------------------------------------------

export interface WorkItemTypeMeta {
  type: WorkItemType;
  label: string;
  /** Types allowed as a parent. Empty = must be a root item. */
  allowedParents: WorkItemType[];
}

export const WORK_ITEM_TYPE_META: Record<WorkItemType, WorkItemTypeMeta> = {
  REQUIREMENT: { type: 'REQUIREMENT', label: 'Requirement', allowedParents: [] },
  EPIC: { type: 'EPIC', label: 'Epic', allowedParents: ['REQUIREMENT'] },
  STORY: { type: 'STORY', label: 'Story', allowedParents: ['EPIC'] },
  TASK: { type: 'TASK', label: 'Task', allowedParents: ['STORY'] },
};

/** Whether an item of `childType` may have a parent of `parentType`. */
export const canParent = (parentType: WorkItemType, childType: WorkItemType): boolean =>
  WORK_ITEM_TYPE_META[childType].allowedParents.includes(parentType);

/** The single child type each type may contain (if any). */
export const childTypeOf = (type: WorkItemType): WorkItemType | null => {
  const entry = WORK_ITEM_TYPES.find((t) => WORK_ITEM_TYPE_META[t].allowedParents.includes(type));
  return entry ?? null;
};

// --- Status metadata --------------------------------------------------------

export type StatusCategory = 'backlog' | 'todo' | 'started' | 'completed' | 'cancelled';

export interface WorkItemStatusMeta {
  status: WorkItemStatus;
  label: string;
  category: StatusCategory;
}

export const WORK_ITEM_STATUS_META: Record<WorkItemStatus, WorkItemStatusMeta> = {
  BACKLOG: { status: 'BACKLOG', label: 'Backlog', category: 'backlog' },
  TODO: { status: 'TODO', label: 'To Do', category: 'todo' },
  IN_PROGRESS: { status: 'IN_PROGRESS', label: 'In Progress', category: 'started' },
  IN_REVIEW: { status: 'IN_REVIEW', label: 'In Review', category: 'started' },
  IN_QA: { status: 'IN_QA', label: 'In QA', category: 'started' },
  DONE: { status: 'DONE', label: 'Done', category: 'completed' },
  CANCELLED: { status: 'CANCELLED', label: 'Cancelled', category: 'cancelled' },
};

export const isTerminalStatus = (status: WorkItemStatus): boolean =>
  status === 'DONE' || status === 'CANCELLED';

// --- Priority metadata ------------------------------------------------------

export interface PriorityMeta {
  priority: Priority;
  label: string;
  /** Sort weight — higher is more urgent. */
  weight: number;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  NONE: { priority: 'NONE', label: 'No priority', weight: 0 },
  LOW: { priority: 'LOW', label: 'Low', weight: 1 },
  MEDIUM: { priority: 'MEDIUM', label: 'Medium', weight: 2 },
  HIGH: { priority: 'HIGH', label: 'High', weight: 3 },
  URGENT: { priority: 'URGENT', label: 'Urgent', weight: 4 },
};

/** Human-readable key, e.g. `EOP-42`. */
export const WORK_ITEM_KEY_PREFIX = 'EOP';
export const workItemKey = (num: number): string => `${WORK_ITEM_KEY_PREFIX}-${num}`;
