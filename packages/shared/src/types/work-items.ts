import type { ActivityType, Priority, WorkItemStatus, WorkItemType } from '../domain/work-items';

/** Lightweight user reference embedded in work-item payloads. */
export interface UserRef {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface LabelDto {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface WorkItemRef {
  id: string;
  number: number;
  key: string;
  type: WorkItemType;
  title: string;
  status: WorkItemStatus;
}

export interface WorkItemSummary {
  id: string;
  number: number;
  key: string;
  type: WorkItemType;
  title: string;
  status: WorkItemStatus;
  priority: Priority;
  storyPoints: number | null;
  sprintId: string | null;
  assignee: UserRef | null;
  parent: WorkItemRef | null;
  labels: LabelDto[];
  childCount: number;
  commentCount: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemDetail extends WorkItemSummary {
  description: string | null;
  reporter: UserRef | null;
  children: WorkItemSummary[];
}

export interface CommentDto {
  id: string;
  workItemId: string;
  author: UserRef | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
}

export interface ActivityDto {
  id: string;
  workItemId: string;
  actor: UserRef | null;
  type: ActivityType;
  field: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}
