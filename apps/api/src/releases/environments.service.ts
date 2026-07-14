import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  type AuthUser,
  type CreateEnvironmentInput,
  type EnvironmentDto,
  type EnvironmentStatusDto,
  type UpdateEnvironmentInput,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { ClientContext } from '../common/utils/request-context';
import { DEPLOYMENT_INCLUDE, toEnvironment, toEnvironmentStatus } from './releases.mapper';

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(): Promise<EnvironmentDto[]> {
    const rows = await this.prisma.environment.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toEnvironment);
  }

  async create(
    input: CreateEnvironmentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<EnvironmentDto> {
    try {
      const row = await this.prisma.environment.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? '#6b7280',
          sortOrder: input.sortOrder ?? 0,
          isProduction: input.isProduction ?? false,
        },
      });
      await this.audit.record({
        action: 'environment.created',
        entityType: 'Environment',
        entityId: row.id,
        actor,
        after: { key: row.key, name: row.name },
        ...ctx,
      });
      this.realtime.emitReleasesChanged();
      return toEnvironment(row);
    } catch (error) {
      throw this.rethrowKeyConflict(error);
    }
  }

  async update(
    id: string,
    input: UpdateEnvironmentInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<EnvironmentDto> {
    await this.getOrThrow(id);
    const data: Prisma.EnvironmentUpdateInput = {};
    if (input.key !== undefined) data.key = input.key;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description ?? null;
    if (input.color !== undefined) data.color = input.color;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isProduction !== undefined) data.isProduction = input.isProduction;

    try {
      const row = await this.prisma.environment.update({ where: { id }, data });
      await this.audit.record({
        action: 'environment.updated',
        entityType: 'Environment',
        entityId: id,
        actor,
        ...ctx,
      });
      this.realtime.emitReleasesChanged();
      return toEnvironment(row);
    } catch (error) {
      throw this.rethrowKeyConflict(error);
    }
  }

  async remove(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const env = await this.getOrThrow(id);
    const deployments = await this.prisma.deployment.count({ where: { environmentId: id } });
    if (deployments > 0) {
      throw new BadRequestException('Cannot delete an environment that has deployments');
    }
    await this.prisma.environment.delete({ where: { id } });
    await this.audit.record({
      action: 'environment.deleted',
      entityType: 'Environment',
      entityId: id,
      actor,
      before: { key: env.key, name: env.name },
      ...ctx,
    });
    this.realtime.emitReleasesChanged();
    return { success: true };
  }

  /** Per-environment view of the release currently live there (latest succeeded deployment). */
  async getStatusOverview(): Promise<EnvironmentStatusDto[]> {
    const environments = await this.prisma.environment.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return Promise.all(
      environments.map(async (env) => {
        const latest = await this.prisma.deployment.findFirst({
          where: { environmentId: env.id, status: 'SUCCEEDED' },
          include: {
            ...DEPLOYMENT_INCLUDE,
            release: { select: { id: true, version: true, name: true } },
          },
          orderBy: [{ finishedAt: 'desc' }, { createdAt: 'desc' }],
        });
        return toEnvironmentStatus(env, latest);
      }),
    );
  }

  private async getOrThrow(id: string) {
    const env = await this.prisma.environment.findUnique({ where: { id } });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }
    return env;
  }

  private rethrowKeyConflict(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('An environment with that key already exists');
    }
    return error as Error;
  }
}
