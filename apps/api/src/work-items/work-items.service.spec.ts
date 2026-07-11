import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { canParent, childTypeOf, type AuthUser } from '@eop/shared';
import { WorkItemsService } from './work-items.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';

const actor: AuthUser = {
  id: 'u1',
  email: 'dev@eop.dev',
  firstName: 'Dev',
  lastName: 'User',
  roles: ['DEVELOPER'],
  permissions: [],
};

const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

function makeRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'w1',
    number: 1,
    type: 'TASK',
    title: 'Do the thing',
    description: null,
    status: 'TODO',
    priority: 'NONE',
    storyPoints: null,
    startDate: null,
    dueDate: null,
    completedAt: null,
    parentId: null,
    assigneeId: null,
    assignee: null,
    parent: null,
    reporter: null,
    labels: [],
    children: [],
    _count: { children: 0, comments: 0 },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    workItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    label: { count: jest.fn() },
    user: { findUnique: jest.fn() },
    comment: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emitBoardChanged: jest.fn(), emitSprintsChanged: jest.fn() };
  const service = new WorkItemsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    realtime as unknown as RealtimeService,
  );
  return { service, prisma, audit, realtime };
}

describe('shared hierarchy helpers', () => {
  it('enforces the Requirement→Epic→Story→Task chain', () => {
    expect(canParent('REQUIREMENT', 'EPIC')).toBe(true);
    expect(canParent('EPIC', 'STORY')).toBe(true);
    expect(canParent('STORY', 'TASK')).toBe(true);
    expect(canParent('REQUIREMENT', 'TASK')).toBe(false);
    expect(canParent('TASK', 'STORY')).toBe(false);
  });

  it('resolves the single child type', () => {
    expect(childTypeOf('REQUIREMENT')).toBe('EPIC');
    expect(childTypeOf('TASK')).toBeNull();
  });
});

describe('WorkItemsService.update', () => {
  it('sets completedAt and records an activity when moved to DONE', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockResolvedValue(makeRow({ status: 'IN_PROGRESS' }));
    let captured: Record<string, unknown> = {};
    prisma.workItem.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(makeRow({ status: 'DONE', completedAt: new Date() }));
    });

    await service.update('w1', { status: 'DONE' }, actor, ctx);

    expect(prisma.workItem.update).toHaveBeenCalledTimes(1);
    expect(captured.status).toBe('DONE');
    expect(captured.completedAt).toBeInstanceOf(Date);
    const activities = (captured.activities as { createMany: { data: Array<{ field: string }> } })
      .createMany.data;
    expect(activities).toHaveLength(1);
    expect(activities[0].field).toBe('status');
  });

  it('clears completedAt when leaving DONE', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockResolvedValue(
      makeRow({ status: 'DONE', completedAt: new Date() }),
    );
    let captured: Record<string, unknown> = {};
    prisma.workItem.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(makeRow({ status: 'IN_QA' }));
    });

    await service.update('w1', { status: 'IN_QA' }, actor, ctx);
    expect(captured.completedAt).toBeNull();
  });

  it('performs no write when nothing changed', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockResolvedValue(makeRow());
    const result = await service.update(
      'w1',
      { status: 'TODO', title: 'Do the thing' },
      actor,
      ctx,
    );
    expect(prisma.workItem.update).not.toHaveBeenCalled();
    expect(result.id).toBe('w1');
  });
});

describe('WorkItemsService.create', () => {
  it('rejects an invalid parent type', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockResolvedValue({
      id: 'p1',
      number: 1,
      type: 'REQUIREMENT',
      parentId: null,
    });
    await expect(
      service.create({ type: 'TASK', title: 'x', parentId: 'p1', labelIds: [] }, actor, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('WorkItemsService.moveWorkItem', () => {
  it('ranks a card between its neighbours and updates status', async () => {
    const { service, prisma, realtime } = makeService();
    prisma.workItem.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'w1')
        return Promise.resolve({ id: 'w1', status: 'TODO', sprintId: 's1' });
      if (where.id === 'b1') return Promise.resolve({ rank: 10 });
      if (where.id === 'a1') return Promise.resolve({ rank: 20 });
      return Promise.resolve(null);
    });
    let captured: Record<string, unknown> = {};
    prisma.workItem.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(makeRow({ status: 'IN_PROGRESS' }));
    });

    await service.moveWorkItem(
      'w1',
      { status: 'IN_PROGRESS', beforeId: 'b1', afterId: 'a1' },
      actor,
      ctx,
    );

    expect(captured.rank).toBe(15);
    expect(captured.status).toBe('IN_PROGRESS');
    expect(captured.completedAt).toBeNull();
    expect(realtime.emitBoardChanged).toHaveBeenCalledWith('s1', 'move');
  });

  it('appends after a single neighbour', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'w1')
        return Promise.resolve({ id: 'w1', status: 'TODO', sprintId: 's1' });
      if (where.id === 'b1') return Promise.resolve({ rank: 10 });
      return Promise.resolve(null);
    });
    let captured: Record<string, unknown> = {};
    prisma.workItem.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(makeRow());
    });

    await service.moveWorkItem('w1', { status: 'TODO', beforeId: 'b1' }, actor, ctx);
    expect(captured.rank).toBe(11);
  });
});

describe('WorkItemsService comment access', () => {
  it('forbids editing another user’s comment without moderation rights', async () => {
    const { service, prisma } = makeService();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c1',
      authorId: 'someone-else',
      workItemId: 'w1',
    });
    await expect(
      service.updateComment('c1', { body: 'edited' }, actor, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
