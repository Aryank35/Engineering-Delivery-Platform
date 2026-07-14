import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  buildPageMeta,
  type AuthUser,
  type CreateDeploymentInput,
  type CreateReleaseInput,
  type DeploymentDto,
  type DeploymentStatus,
  type ListReleasesQuery,
  type Paginated,
  type ReleaseDetail,
  type ReleaseStatus,
  type ReleaseSummary,
  type UpdateDeploymentInput,
  type UpdateReleaseInput,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { ClientContext } from '../common/utils/request-context';
import {
  DEPLOYMENT_INCLUDE,
  RELEASE_DETAIL_INCLUDE,
  RELEASE_SUMMARY_INCLUDE,
  toDeployment,
  toReleaseDetail,
  toReleaseSummary,
  type ReleaseDetailRow,
} from './releases.mapper';

@Injectable()
export class ReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Releases ---------------------------------------------------------------

  async create(input: CreateReleaseInput, actor: AuthUser, ctx: ClientContext): Promise<ReleaseDetail> {
    const itemIds = input.workItemIds ?? [];
    if (itemIds.length) await this.assertItemsExist(itemIds);
    const status = input.status ?? 'PLANNED';

    try {
      const row = await this.prisma.release.create({
        data: {
          version: input.version,
          name: input.name ?? null,
          notes: input.notes ?? null,
          status,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          releasedAt: status === 'RELEASED' ? new Date() : null,
          createdById: actor.id,
          workItems: itemIds.length ? { connect: itemIds.map((id) => ({ id })) } : undefined,
        },
        include: RELEASE_DETAIL_INCLUDE,
      });
      await this.audit.record({
        action: 'release.created',
        entityType: 'Release',
        entityId: row.id,
        actor,
        after: { version: row.version, status: row.status },
        ...ctx,
      });
      this.realtime.emitReleasesChanged();
      return toReleaseDetail(row);
    } catch (error) {
      throw this.rethrowVersionConflict(error);
    }
  }

  async list(query: ListReleasesQuery): Promise<Paginated<ReleaseSummary>> {
    const where: Prisma.ReleaseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { version: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.release.count({ where }),
      this.prisma.release.findMany({
        where,
        include: RELEASE_SUMMARY_INCLUDE,
        orderBy: { createdAt: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      data: rows.map(toReleaseSummary),
      meta: buildPageMeta(query.page, query.pageSize, total),
    };
  }

  async findById(id: string): Promise<ReleaseDetail> {
    return toReleaseDetail(await this.getDetailRow(id));
  }

  async update(
    id: string,
    input: UpdateReleaseInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<ReleaseDetail> {
    await this.getDetailRow(id);
    const data: Prisma.ReleaseUpdateInput = {};
    if (input.version !== undefined) data.version = input.version;
    if (input.name !== undefined) data.name = input.name;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.targetDate !== undefined) {
      data.targetDate = input.targetDate ? new Date(input.targetDate) : null;
    }

    try {
      const row = await this.prisma.release.update({
        where: { id },
        data,
        include: RELEASE_DETAIL_INCLUDE,
      });
      await this.audit.record({
        action: 'release.updated',
        entityType: 'Release',
        entityId: id,
        actor,
        ...ctx,
      });
      this.realtime.emitReleasesChanged();
      return toReleaseDetail(row);
    } catch (error) {
      throw this.rethrowVersionConflict(error);
    }
  }

  async setStatus(
    id: string,
    status: ReleaseStatus,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<ReleaseDetail> {
    const existing = await this.getDetailRow(id);
    const becomingReleased = status === 'RELEASED' && existing.status !== 'RELEASED';

    const row = await this.prisma.release.update({
      where: { id },
      data: {
        status,
        // Stamp the first time it ships; keep the original date afterwards.
        releasedAt: becomingReleased ? new Date() : undefined,
      },
      include: RELEASE_DETAIL_INCLUDE,
    });
    await this.audit.record({
      action: 'release.status_changed',
      entityType: 'Release',
      entityId: id,
      actor,
      after: { status },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    if (becomingReleased) {
      await this.notifyReleasePublished(row, actor.id);
    }
    return toReleaseDetail(row);
  }

  async remove(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const release = await this.prisma.release.findUnique({
      where: { id },
      select: { id: true, version: true },
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }
    await this.prisma.release.delete({ where: { id } });
    await this.audit.record({
      action: 'release.deleted',
      entityType: 'Release',
      entityId: id,
      actor,
      before: { version: release.version },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return { success: true };
  }

  async addItems(
    id: string,
    itemIds: string[],
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<ReleaseDetail> {
    await this.getDetailRow(id);
    await this.assertItemsExist(itemIds);
    const row = await this.prisma.release.update({
      where: { id },
      data: { workItems: { connect: itemIds.map((itemId) => ({ id: itemId })) } },
      include: RELEASE_DETAIL_INCLUDE,
    });
    await this.audit.record({
      action: 'release.items_added',
      entityType: 'Release',
      entityId: id,
      actor,
      metadata: { count: itemIds.length },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return toReleaseDetail(row);
  }

  async removeItems(
    id: string,
    itemIds: string[],
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<ReleaseDetail> {
    await this.getDetailRow(id);
    // Only detach items that actually belong to this release.
    await this.prisma.workItem.updateMany({
      where: { id: { in: itemIds }, releaseId: id },
      data: { releaseId: null },
    });
    const row = await this.getDetailRow(id);
    await this.audit.record({
      action: 'release.items_removed',
      entityType: 'Release',
      entityId: id,
      actor,
      metadata: { count: itemIds.length },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return toReleaseDetail(row);
  }

  // --- Deployments ------------------------------------------------------------

  async createDeployment(
    releaseId: string,
    input: CreateDeploymentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<DeploymentDto> {
    await this.getDetailRow(releaseId);
    const env = await this.prisma.environment.findUnique({ where: { id: input.environmentId } });
    if (!env) {
      throw new BadRequestException('Environment not found');
    }
    const status = input.status ?? 'PENDING';
    const now = new Date();
    const row = await this.prisma.deployment.create({
      data: {
        releaseId,
        environmentId: input.environmentId,
        status,
        notes: input.notes ?? null,
        deployedById: actor.id,
        startedAt: status === 'PENDING' ? null : now,
        finishedAt: this.isTerminal(status) ? now : null,
      },
      include: DEPLOYMENT_INCLUDE,
    });
    await this.audit.record({
      action: 'deployment.created',
      entityType: 'Deployment',
      entityId: row.id,
      actor,
      after: { releaseId, environment: env.key, status },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return toDeployment(row);
  }

  async updateDeployment(
    deploymentId: string,
    input: UpdateDeploymentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<DeploymentDto> {
    const existing = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!existing) {
      throw new NotFoundException('Deployment not found');
    }
    const data: Prisma.DeploymentUpdateInput = {};
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined && input.status !== existing.status) {
      data.status = input.status;
      const now = new Date();
      if (!existing.startedAt && input.status !== 'PENDING') data.startedAt = now;
      data.finishedAt = this.isTerminal(input.status) ? now : null;
    }

    const row = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data,
      include: DEPLOYMENT_INCLUDE,
    });
    await this.audit.record({
      action: 'deployment.updated',
      entityType: 'Deployment',
      entityId: deploymentId,
      actor,
      after: input.status ? { status: input.status } : undefined,
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return toDeployment(row);
  }

  // --- Internals --------------------------------------------------------------

  private isTerminal(status: DeploymentStatus): boolean {
    return status === 'SUCCEEDED' || status === 'FAILED' || status === 'ROLLED_BACK';
  }

  private async getDetailRow(id: string): Promise<ReleaseDetailRow> {
    const row = await this.prisma.release.findUnique({
      where: { id },
      include: RELEASE_DETAIL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Release not found');
    }
    return row;
  }

  private async assertItemsExist(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const count = await this.prisma.workItem.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException('One or more work items are invalid');
    }
  }

  private async notifyReleasePublished(release: ReleaseDetailRow, actorId: string): Promise<void> {
    const assigneeIds = release.workItems.map((item) => item.assigneeId);
    await this.notifications.emitToMany(assigneeIds, {
      type: 'RELEASE_PUBLISHED',
      title: `Release ${release.version} shipped`,
      body: release.name ?? `A release containing your work is now live.`,
      link: `/releases/${release.id}`,
      entityType: 'Release',
      entityId: release.id,
      actorId,
    });
  }

  private rethrowVersionConflict(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('A release with that version already exists');
    }
    return error as Error;
  }
}
