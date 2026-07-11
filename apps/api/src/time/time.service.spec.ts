import { computeElapsedSeconds, formatDuration, type AuthUser } from '@eop/shared';
import { TimeService } from './time.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';

const actor: AuthUser = {
  id: 'u1',
  email: 'dev@eop.dev',
  firstName: 'Dev',
  lastName: 'User',
  roles: ['DEVELOPER'],
  permissions: ['time:log'],
};
const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

const logRow = (seconds: number, source: 'TIMER' | 'MANUAL') => ({
  id: 'log1',
  workItemId: 'w1',
  userId: 'u1',
  seconds,
  description: null,
  source,
  spentOn: new Date('2026-02-02T00:00:00.000Z'),
  startedAt: null,
  endedAt: null,
  createdAt: new Date('2026-02-02T10:00:00.000Z'),
  user: null,
  workItem: { id: 'w1', number: 7, title: 'Build feature' },
});

function makeService() {
  const tx = {
    timeLog: { create: jest.fn() },
    activeTimer: { delete: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    activeTimer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    timeLog: { create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    workItem: { findUnique: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : arg,
    ),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new TimeService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, prisma, tx };
}

describe('time helpers', () => {
  it('computes elapsed seconds for a paused timer', () => {
    expect(computeElapsedSeconds(100, 'PAUSED', null, Date.now())).toBe(100);
  });

  it('adds live time for a running timer', () => {
    const now = 1_000_000;
    expect(computeElapsedSeconds(100, 'RUNNING', now - 10_000, now)).toBe(110);
  });

  it('formats durations', () => {
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(90)).toBe('1m');
  });
});

describe('TimeService.stopTimer', () => {
  it('commits a paused timer to a time log and clears it', async () => {
    const { service, prisma, tx } = makeService();
    prisma.activeTimer.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      workItemId: 'w1',
      status: 'PAUSED',
      accumulatedSeconds: 120,
      startedAt: new Date('2026-02-02T09:00:00.000Z'),
      lastStartedAt: null,
      description: null,
      workItem: { id: 'w1', number: 7, title: 'Build feature' },
    });
    let capturedSeconds = 0;
    tx.timeLog.create.mockImplementation(({ data }: { data: { seconds: number } }) => {
      capturedSeconds = data.seconds;
      return Promise.resolve(logRow(data.seconds, 'TIMER'));
    });

    const result = await service.stopTimer(actor, ctx);

    expect(capturedSeconds).toBe(120);
    expect(result?.seconds).toBe(120);
    expect(result?.source).toBe('TIMER');
    expect(tx.activeTimer.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});

describe('TimeService.createManualLog', () => {
  it('converts minutes to seconds', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findUnique.mockResolvedValue({ id: 'w1' });
    prisma.timeLog.create.mockResolvedValue(logRow(1800, 'MANUAL'));

    const result = await service.createManualLog(actor, { workItemId: 'w1', minutes: 30 }, ctx);
    expect(result.seconds).toBe(1800);
    expect(prisma.timeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ seconds: 1800, source: 'MANUAL' }) }),
    );
  });
});
