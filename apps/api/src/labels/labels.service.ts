import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type AuthUser,
  type CreateLabelInput,
  type LabelDto,
  type UpdateLabelInput,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { ClientContext } from '../common/utils/request-context';
import { toLabel } from '../work-items/work-items.mapper';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<LabelDto[]> {
    const rows = await this.prisma.label.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toLabel);
  }

  async create(input: CreateLabelInput, actor: AuthUser, ctx: ClientContext): Promise<LabelDto> {
    const label = await this.prisma.label.create({ data: input });
    await this.audit.record({
      action: 'label.created',
      entityType: 'Label',
      entityId: label.id,
      actor,
      after: { name: label.name, color: label.color },
      ...ctx,
    });
    return toLabel(label);
  }

  async update(
    id: string,
    input: UpdateLabelInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<LabelDto> {
    await this.getOrThrow(id);
    const label = await this.prisma.label.update({ where: { id }, data: input });
    await this.audit.record({
      action: 'label.updated',
      entityType: 'Label',
      entityId: id,
      actor,
      after: { name: label.name, color: label.color },
      ...ctx,
    });
    return toLabel(label);
  }

  async remove(id: string, actor: AuthUser, ctx: ClientContext): Promise<{ success: true }> {
    const label = await this.getOrThrow(id);
    await this.prisma.label.delete({ where: { id } });
    await this.audit.record({
      action: 'label.deleted',
      entityType: 'Label',
      entityId: id,
      actor,
      before: { name: label.name },
      ...ctx,
    });
    return { success: true };
  }

  private async getOrThrow(id: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) {
      throw new NotFoundException('Label not found');
    }
    return label;
  }
}
