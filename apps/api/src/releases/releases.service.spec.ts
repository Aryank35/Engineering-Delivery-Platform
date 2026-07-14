import type { AuthUser } from '@eop/shared';
import { ReleasesService } from './releases.service';
import { toReleaseSummary } from './releases.mapper';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';
import type { NotificationsService } from '../notifications/notifications.service';

const actor: AuthUser = {
  id: 'u1',
  email: 'em@eop.dev',
  firstName: 'Eng',
  lastName: 'Manager',
  roles: ['ENGINEERING_MANAGER'],
  permissions: ['release:manage'],
};
const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

const now = new Date('2026-07-14T00:00:00.000Z');

// A full work-item row as returned under RELEASE_DETAIL_INCLUDE (toSummary reads all of these).
function wi(assigneeId: string | null) {
  return {
    id: `w-${assigneeId ?? 'none'}`,
    number: 1,
    type: 'TASK',
    title: 'Item',
    status: 'DONE',
    priority: 'NONE',
    storyPoints: null,
    sprintId: null,
    releaseId: 'r1',
    assigneeId,
    assignee: null,
    parent: null,
    labels: [],
    _count: { children: 0, comments: 0 },
    startDate: null,
    dueDate: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    version: 'v1.0.0',
    name: null,
    notes: null,
    status: 'IN_PROGRESS',
    targetDate: null,
    releasedAt: null,
    createdById: 'u1',
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    _count: { workItems: 2 },
    deployments: [],
    workItems: [wi('u2'), wi('u3'), wi(null)],
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    release: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    deployment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    environment: { findUnique: jest.fn() },
    workItem: { count: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emitReleasesChanged: jest.fn() };
  const notifications = { emit: jest.fn(), emitToMany: jest.fn() };
  const service = new ReleasesService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    realtime as unknown as RealtimeService,
    notifications as unknown as NotificationsService,
  );
  return { service, prisma, realtime, notifications };
}

describe('ReleasesService.setStatus', () => {
  it('stamps releasedAt and notifies item assignees when first released', async () => {
    const { service, prisma, notifications } = makeService();
    prisma.release.findUnique.mockResolvedValue(detailRow({ status: 'IN_PROGRESS' }));
    let captured: Record<string, unknown> = {};
    prisma.release.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(detailRow({ status: 'RELEASED', releasedAt: now }));
    });

    await service.setStatus('r1', 'RELEASED', actor, ctx);

    expect(captured.releasedAt).toBeInstanceOf(Date);
    expect(notifications.emitToMany).toHaveBeenCalledWith(
      ['u2', 'u3', null],
      expect.objectContaining({ type: 'RELEASE_PUBLISHED', entityId: 'r1', actorId: 'u1' }),
    );
  });

  it('does not re-stamp or re-notify a release already released', async () => {
    const { service, prisma, notifications } = makeService();
    prisma.release.findUnique.mockResolvedValue(detailRow({ status: 'RELEASED', releasedAt: now }));
    let captured: Record<string, unknown> = {};
    prisma.release.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve(detailRow({ status: 'RELEASED', releasedAt: now }));
    });

    await service.setStatus('r1', 'RELEASED', actor, ctx);

    expect(captured.releasedAt).toBeUndefined();
    expect(notifications.emitToMany).not.toHaveBeenCalled();
  });
});

describe('ReleasesService.createDeployment', () => {
  it('stamps startedAt and finishedAt for a terminal status', async () => {
    const { service, prisma } = makeService();
    prisma.release.findUnique.mockResolvedValue(detailRow());
    prisma.environment.findUnique.mockResolvedValue({ id: 'e1', key: 'production' });
    let captured: Record<string, unknown> = {};
    prisma.deployment.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      captured = data;
      return Promise.resolve({
        id: 'd1',
        releaseId: 'r1',
        environmentId: 'e1',
        status: 'SUCCEEDED',
        notes: null,
        deployedBy: null,
        startedAt: now,
        finishedAt: now,
        createdAt: now,
        updatedAt: now,
        environment: { id: 'e1', key: 'production', name: 'Production', color: '#10b981', isProduction: true },
      });
    });

    const result = await service.createDeployment('r1', { environmentId: 'e1', status: 'SUCCEEDED' }, actor, ctx);

    expect(captured.startedAt).toBeInstanceOf(Date);
    expect(captured.finishedAt).toBeInstanceOf(Date);
    expect(result.environment.name).toBe('Production');
  });
});

describe('release mapper liveEnvironments', () => {
  it('marks an environment live only when its latest deployment succeeded', () => {
    const env = (id: string, name: string) => ({
      id,
      key: name.toLowerCase(),
      name,
      color: '#000000',
      isProduction: false,
    });
    const dep = (environmentId: string, status: string, environment: ReturnType<typeof env>) => ({
      id: `${environmentId}-${status}`,
      releaseId: 'r1',
      environmentId,
      status,
      notes: null,
      deployedBy: null,
      startedAt: now,
      finishedAt: now,
      createdAt: now,
      updatedAt: now,
      environment,
    });
    const staging = env('e1', 'Staging');
    const prod = env('e2', 'Production');

    const summary = toReleaseSummary(
      detailRow({
        // Pre-sorted newest-first: staging was rolled back after succeeding; prod is live.
        deployments: [
          dep('e1', 'ROLLED_BACK', staging),
          dep('e1', 'SUCCEEDED', staging),
          dep('e2', 'SUCCEEDED', prod),
        ],
      }) as never,
    );

    expect(summary.liveEnvironments.map((e) => e.name)).toEqual(['Production']);
  });
});
