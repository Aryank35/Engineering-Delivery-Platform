import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  buildPageMeta,
  canParent,
  PERMISSIONS,
  workItemKey,
  WORK_ITEM_TYPE_META,
  type ActivityDto,
  type AuthUser,
  type CommentDto,
  type CreateCommentInput,
  type CreateWorkItemInput,
  type ListWorkItemsQuery,
  type MoveWorkItemInput,
  type Paginated,
  type UpdateCommentInput,
  type UpdateWorkItemInput,
  type WorkItemDetail,
  type WorkItemSummary,
  type WorkItemType,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService, type NotificationSpec } from '../notifications/notifications.service';
import type { ClientContext } from '../common/utils/request-context';
import {
  ACTIVITY_INCLUDE,
  COMMENT_INCLUDE,
  DETAIL_INCLUDE,
  SUMMARY_INCLUDE,
  toActivity,
  toComment,
  toDetail,
  toSummary,
  type WorkItemDetailRow,
} from './work-items.mapper';

const SORTABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'priority',
  'number',
  'dueDate',
  'title',
  'status',
]);

interface PendingActivity {
  field: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Work items -------------------------------------------------------------

  async create(
    input: CreateWorkItemInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<WorkItemDetail> {
    if (input.parentId) {
      await this.assertValidParent(input.type, input.parentId, null);
    }
    await this.assertLabelsExist(input.labelIds ?? []);
    if (input.assigneeId) {
      await this.assertUserExists(input.assigneeId);
    }

    const status = input.status ?? 'BACKLOG';
    const created = await this.prisma.workItem.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        status,
        priority: input.priority ?? 'NONE',
        storyPoints: input.storyPoints ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        completedAt: status === 'DONE' ? new Date() : null,
        rank: Date.now(),
        reporterId: actor.id,
        parentId: input.parentId ?? null,
        assigneeId: input.assigneeId ?? null,
        labels: input.labelIds?.length
          ? { create: input.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
        activities: { create: { type: 'CREATED', actorId: actor.id } },
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      action: 'workitem.created',
      entityType: 'WorkItem',
      entityId: created.id,
      actor,
      after: { key: workItemKey(created.number), type: created.type, title: created.title },
      ...ctx,
    });
    if (created.assigneeId) {
      await this.notifications.emit(this.assignedNotification(created, actor));
    }
    return toDetail(created);
  }

  async list(query: ListWorkItemsQuery): Promise<Paginated<WorkItemSummary>> {
    const where: Prisma.WorkItemWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.reporterId ? { reporterId: query.reporterId } : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.labelId ? { labels: { some: { labelId: query.labelId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workItem.count({ where }),
      this.prisma.workItem.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: { [sortField]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: rows.map(toSummary),
      meta: buildPageMeta(query.page, query.pageSize, total),
    };
  }

  async findById(id: string): Promise<WorkItemDetail> {
    return toDetail(await this.getDetailRow(id));
  }

  async update(
    id: string,
    input: UpdateWorkItemInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<WorkItemDetail> {
    const existing = await this.getDetailRow(id);
    const data: Prisma.WorkItemUpdateInput = {};
    const activities: PendingActivity[] = [];
    let newAssigneeId: string | null = null;

    if (input.title !== undefined && input.title !== existing.title) {
      data.title = input.title;
      activities.push({ field: 'title', data: { from: existing.title, to: input.title } });
    }

    if (input.description !== undefined && input.description !== existing.description) {
      data.description = input.description;
      activities.push({ field: 'description' });
    }

    if (input.status !== undefined && input.status !== existing.status) {
      data.status = input.status;
      data.completedAt = input.status === 'DONE' ? new Date() : null;
      activities.push({ field: 'status', data: { from: existing.status, to: input.status } });
    }

    if (input.priority !== undefined && input.priority !== existing.priority) {
      data.priority = input.priority;
      activities.push({ field: 'priority', data: { from: existing.priority, to: input.priority } });
    }

    if (input.storyPoints !== undefined && input.storyPoints !== existing.storyPoints) {
      data.storyPoints = input.storyPoints;
      activities.push({
        field: 'storyPoints',
        data: { from: existing.storyPoints, to: input.storyPoints },
      });
    }

    this.diffDate('startDate', input.startDate, existing.startDate, activities, (v) => {
      data.startDate = v;
    });
    this.diffDate('dueDate', input.dueDate, existing.dueDate, activities, (v) => {
      data.dueDate = v;
    });

    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      const toName = input.assigneeId ? (await this.assertUserExists(input.assigneeId)).name : null;
      newAssigneeId = input.assigneeId ?? null;
      data.assignee = input.assigneeId
        ? { connect: { id: input.assigneeId } }
        : { disconnect: true };
      activities.push({
        field: 'assignee',
        data: { from: existing.assignee ? this.fullName(existing.assignee) : null, to: toName },
      });
    }

    if (input.parentId !== undefined && input.parentId !== existing.parentId) {
      let toKey: string | null = null;
      if (input.parentId) {
        const parent = await this.assertValidParent(
          existing.type as WorkItemType,
          input.parentId,
          id,
        );
        toKey = workItemKey(parent.number);
      }
      data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
      activities.push({
        field: 'parent',
        data: { from: existing.parent ? workItemKey(existing.parent.number) : null, to: toKey },
      });
    }

    if (input.labelIds) {
      const currentIds = existing.labels.map((l) => l.labelId);
      const nextIds = [...new Set(input.labelIds)];
      const added = nextIds.filter((x) => !currentIds.includes(x));
      const removed = currentIds.filter((x) => !nextIds.includes(x));
      if (added.length || removed.length) {
        await this.assertLabelsExist(added);
        data.labels = {
          deleteMany: removed.length ? { labelId: { in: removed } } : undefined,
          create: added.map((labelId) => ({ labelId })),
        };
        const names = await this.labelNames([...added, ...removed]);
        activities.push({
          field: 'labels',
          data: {
            added: added.map((x) => names[x] ?? x),
            removed: removed.map((x) => names[x] ?? x),
          },
        });
      }
    }

    if (activities.length === 0) {
      return toDetail(existing);
    }

    data.activities = {
      createMany: {
        data: activities.map((a) => ({
          type: 'FIELD_CHANGED' as const,
          actorId: actor.id,
          field: a.field,
          data: (a.data ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
        })),
      },
    };

    const updated = await this.prisma.workItem.update({
      where: { id },
      data,
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      action: 'workitem.updated',
      entityType: 'WorkItem',
      entityId: id,
      actor,
      metadata: { fields: activities.map((a) => a.field) },
      ...ctx,
    });
    if (updated.sprintId) {
      this.realtime.emitBoardChanged(updated.sprintId, 'updated');
    }
    if (newAssigneeId) {
      await this.notifications.emit(this.assignedNotification(updated, actor));
    }
    return toDetail(updated);
  }

  /** Board drag-and-drop: change column (status), sprint and rank in one shot. */
  async moveWorkItem(
    id: string,
    input: MoveWorkItemInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<WorkItemSummary> {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
      select: { id: true, status: true, sprintId: true },
    });
    if (!item) {
      throw new NotFoundException('Work item not found');
    }

    const targetSprintId = input.sprintId !== undefined ? input.sprintId : item.sprintId;
    const rank = await this.computeRank(input.beforeId, input.afterId);
    const statusChanged = input.status !== item.status;

    const data: Prisma.WorkItemUpdateInput = { rank };
    if (statusChanged) {
      data.status = input.status;
      data.completedAt = input.status === 'DONE' ? new Date() : null;
      data.activities = {
        create: {
          type: 'FIELD_CHANGED',
          actorId: actor.id,
          field: 'status',
          data: { from: item.status, to: input.status },
        },
      };
    }
    if (input.sprintId !== undefined) {
      data.sprint = input.sprintId ? { connect: { id: input.sprintId } } : { disconnect: true };
    }

    const updated = await this.prisma.workItem.update({
      where: { id },
      data,
      include: SUMMARY_INCLUDE,
    });

    this.realtime.emitBoardChanged(targetSprintId, 'move');
    if (item.sprintId && item.sprintId !== targetSprintId) {
      this.realtime.emitBoardChanged(item.sprintId, 'move');
    }

    await this.audit.record({
      action: 'workitem.moved',
      entityType: 'WorkItem',
      entityId: id,
      actor,
      metadata: { from: item.status, to: input.status, sprintId: targetSprintId },
      ...ctx,
    });
    return toSummary(updated);
  }

  private async computeRank(beforeId?: string, afterId?: string): Promise<number> {
    const [before, after] = await Promise.all([
      beforeId
        ? this.prisma.workItem.findUnique({ where: { id: beforeId }, select: { rank: true } })
        : Promise.resolve(null),
      afterId
        ? this.prisma.workItem.findUnique({ where: { id: afterId }, select: { rank: true } })
        : Promise.resolve(null),
    ]);
    const b = before?.rank;
    const a = after?.rank;
    if (b !== undefined && a !== undefined) return (b + a) / 2;
    if (b !== undefined) return b + 1;
    if (a !== undefined) return a - 1;
    return Date.now();
  }

  async remove(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
      select: { id: true, number: true, title: true, _count: { select: { children: true } } },
    });
    if (!item) {
      throw new NotFoundException('Work item not found');
    }
    if (item._count.children > 0) {
      throw new BadRequestException('Delete or re-parent this item’s children first');
    }

    await this.prisma.workItem.delete({ where: { id } });
    await this.audit.record({
      action: 'workitem.deleted',
      entityType: 'WorkItem',
      entityId: id,
      actor,
      before: { key: workItemKey(item.number), title: item.title },
      ...ctx,
    });
    return { success: true };
  }

  // --- Comments ---------------------------------------------------------------

  async addComment(
    workItemId: string,
    input: CreateCommentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<CommentDto> {
    const workItem = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
      select: { id: true, number: true, title: true, assigneeId: true, reporterId: true },
    });
    if (!workItem) {
      throw new NotFoundException('Work item not found');
    }
    const comment = await this.prisma.comment.create({
      data: { workItemId, authorId: actor.id, body: input.body },
      include: COMMENT_INCLUDE,
    });
    await this.audit.record({
      action: 'comment.created',
      entityType: 'Comment',
      entityId: comment.id,
      actor,
      metadata: { workItemId },
      ...ctx,
    });
    // Notify the item's assignee and reporter (the comment author is skipped).
    await this.notifications.emitToMany([workItem.assigneeId, workItem.reporterId], {
      type: 'COMMENT_ADDED',
      title: `New comment on ${workItemKey(workItem.number)}`,
      body: `${this.fullName(actor)}: ${this.commentPreview(input.body)}`,
      link: `/work/${workItem.id}`,
      entityType: 'WorkItem',
      entityId: workItem.id,
      actorId: actor.id,
    });
    return toComment(comment);
  }

  async listComments(workItemId: string): Promise<CommentDto[]> {
    await this.assertWorkItemExists(workItemId);
    const rows = await this.prisma.comment.findMany({
      where: { workItemId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toComment);
  }

  async updateComment(
    commentId: string,
    input: UpdateCommentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<CommentDto> {
    const comment = await this.getComment(commentId);
    this.assertCommentAccess(comment.authorId, actor);
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: input.body, editedAt: new Date() },
      include: COMMENT_INCLUDE,
    });
    await this.audit.record({
      action: 'comment.updated',
      entityType: 'Comment',
      entityId: commentId,
      actor,
      ...ctx,
    });
    return toComment(updated);
  }

  async deleteComment(
    commentId: string,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<{ success: true }> {
    const comment = await this.getComment(commentId);
    this.assertCommentAccess(comment.authorId, actor);
    await this.prisma.comment.delete({ where: { id: commentId } });
    await this.audit.record({
      action: 'comment.deleted',
      entityType: 'Comment',
      entityId: commentId,
      actor,
      metadata: { workItemId: comment.workItemId },
      ...ctx,
    });
    return { success: true };
  }

  // --- Activities -------------------------------------------------------------

  async listActivities(workItemId: string): Promise<ActivityDto[]> {
    await this.assertWorkItemExists(workItemId);
    const rows = await this.prisma.workItemActivity.findMany({
      where: { workItemId },
      include: ACTIVITY_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return rows.map(toActivity);
  }

  // --- Internals --------------------------------------------------------------

  private async getDetailRow(id: string): Promise<WorkItemDetailRow> {
    const row = await this.prisma.workItem.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) {
      throw new NotFoundException('Work item not found');
    }
    return row;
  }

  private async assertWorkItemExists(id: string): Promise<void> {
    const found = await this.prisma.workItem.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new NotFoundException('Work item not found');
    }
  }

  private async assertValidParent(
    childType: WorkItemType,
    parentId: string,
    selfId: string | null,
  ): Promise<{ id: string; number: number }> {
    const parent = await this.prisma.workItem.findUnique({
      where: { id: parentId },
      select: { id: true, number: true, type: true, parentId: true },
    });
    if (!parent) {
      throw new BadRequestException('Parent work item not found');
    }
    if (selfId && parent.id === selfId) {
      throw new BadRequestException('A work item cannot be its own parent');
    }
    if (!canParent(parent.type as WorkItemType, childType)) {
      throw new BadRequestException(
        `A ${WORK_ITEM_TYPE_META[childType].label} cannot be nested under a ${WORK_ITEM_TYPE_META[parent.type as WorkItemType].label}`,
      );
    }
    // Cycle guard: ensure selfId is not an ancestor of the proposed parent.
    if (selfId) {
      const visited = new Set<string>();
      let cursor: string | null = parent.parentId;
      while (cursor) {
        if (cursor === selfId) {
          throw new BadRequestException('Cannot move an item beneath its own descendant');
        }
        if (visited.has(cursor)) break;
        visited.add(cursor);
        const next: { parentId: string | null } | null = await this.prisma.workItem.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = next?.parentId ?? null;
      }
    }
    return { id: parent.id, number: parent.number };
  }

  private async assertLabelsExist(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const count = await this.prisma.label.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException('One or more labels are invalid');
    }
  }

  private async assertUserExists(id: string): Promise<{ name: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new BadRequestException('Assignee not found or inactive');
    }
    return { name: `${user.firstName} ${user.lastName}`.trim() };
  }

  private async labelNames(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) return {};
    const labels = await this.prisma.label.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return Object.fromEntries(labels.map((l) => [l.id, l.name]));
  }

  private async getComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, workItemId: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  private assertCommentAccess(authorId: string, actor: AuthUser): void {
    const canModerate = actor.permissions.includes(PERMISSIONS.COMMENT_MODERATE);
    if (authorId !== actor.id && !canModerate) {
      throw new ForbiddenException('You can only modify your own comments');
    }
  }

  private diffDate(
    field: 'startDate' | 'dueDate',
    incoming: string | null | undefined,
    current: Date | null,
    activities: PendingActivity[],
    set: (value: Date | null) => void,
  ): void {
    if (incoming === undefined) return;
    const next = incoming ? new Date(incoming) : null;
    const currentTime = current ? current.getTime() : null;
    const nextTime = next ? next.getTime() : null;
    if (currentTime === nextTime) return;
    set(next);
    activities.push({
      field,
      data: { from: current ? current.toISOString() : null, to: next ? next.toISOString() : null },
    });
  }

  private fullName(user: { firstName: string; lastName: string }): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  /** Build the "assigned to you" notification for a work item's current assignee. */
  private assignedNotification(
    item: { id: string; number: number; title: string; assigneeId: string | null },
    actor: AuthUser,
  ): NotificationSpec {
    return {
      userId: item.assigneeId as string,
      type: 'WORK_ITEM_ASSIGNED',
      title: `${workItemKey(item.number)} was assigned to you`,
      body: item.title,
      link: `/work/${item.id}`,
      entityType: 'WorkItem',
      entityId: item.id,
      actorId: actor.id,
    };
  }

  private commentPreview(body: string): string {
    const trimmed = body.trim();
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
  }
}
