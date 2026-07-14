import { Prisma } from '@eop/database';
import {
  workItemKey,
  type ActivityDto,
  type CommentDto,
  type LabelDto,
  type Priority,
  type UserRef,
  type WorkItemDetail,
  type WorkItemRef,
  type WorkItemStatus,
  type WorkItemSummary,
  type WorkItemType,
} from '@eop/shared';

export const USER_REF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const PARENT_SELECT = {
  id: true,
  number: true,
  type: true,
  title: true,
  status: true,
} satisfies Prisma.WorkItemSelect;

export const SUMMARY_INCLUDE = {
  assignee: { select: USER_REF_SELECT },
  parent: { select: PARENT_SELECT },
  labels: { include: { label: true }, orderBy: { label: { name: 'asc' } } },
  _count: { select: { children: true, comments: true } },
} satisfies Prisma.WorkItemInclude;

export const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  reporter: { select: USER_REF_SELECT },
  children: { include: SUMMARY_INCLUDE, orderBy: { number: 'asc' } },
} satisfies Prisma.WorkItemInclude;

export const COMMENT_INCLUDE = {
  author: { select: USER_REF_SELECT },
} satisfies Prisma.CommentInclude;

export const ACTIVITY_INCLUDE = {
  actor: { select: USER_REF_SELECT },
} satisfies Prisma.WorkItemActivityInclude;

export type WorkItemSummaryRow = Prisma.WorkItemGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
export type WorkItemDetailRow = Prisma.WorkItemGetPayload<{ include: typeof DETAIL_INCLUDE }>;
export type CommentRow = Prisma.CommentGetPayload<{ include: typeof COMMENT_INCLUDE }>;
export type ActivityRow = Prisma.WorkItemActivityGetPayload<{ include: typeof ACTIVITY_INCLUDE }>;
export type LabelRow = Prisma.LabelGetPayload<Record<string, never>>;

type UserRefRow = Prisma.UserGetPayload<{ select: typeof USER_REF_SELECT }>;

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

export function toUserRef(user: UserRefRow | null): UserRef | null {
  if (!user) return null;
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

export function toLabel(label: LabelRow): LabelDto {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    createdAt: label.createdAt.toISOString(),
  };
}

function toRef(
  parent: Prisma.WorkItemGetPayload<{ select: typeof PARENT_SELECT }> | null,
): WorkItemRef | null {
  if (!parent) return null;
  return {
    id: parent.id,
    number: parent.number,
    key: workItemKey(parent.number),
    type: parent.type as WorkItemType,
    title: parent.title,
    status: parent.status as WorkItemStatus,
  };
}

export function toSummary(row: WorkItemSummaryRow): WorkItemSummary {
  return {
    id: row.id,
    number: row.number,
    key: workItemKey(row.number),
    type: row.type as WorkItemType,
    title: row.title,
    status: row.status as WorkItemStatus,
    priority: row.priority as Priority,
    storyPoints: row.storyPoints,
    sprintId: row.sprintId,
    releaseId: row.releaseId,
    assignee: toUserRef(row.assignee),
    parent: toRef(row.parent),
    labels: row.labels.map((l) => toLabel(l.label)),
    childCount: row._count.children,
    commentCount: row._count.comments,
    startDate: iso(row.startDate),
    dueDate: iso(row.dueDate),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDetail(row: WorkItemDetailRow): WorkItemDetail {
  return {
    ...toSummary(row),
    description: row.description,
    reporter: toUserRef(row.reporter),
    children: row.children.map(toSummary),
  };
}

export function toComment(row: CommentRow): CommentDto {
  return {
    id: row.id,
    workItemId: row.workItemId,
    author: toUserRef(row.author),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: iso(row.editedAt),
  };
}

export function toActivity(row: ActivityRow): ActivityDto {
  return {
    id: row.id,
    workItemId: row.workItemId,
    actor: toUserRef(row.actor),
    type: row.type,
    field: row.field,
    data: (row.data as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
