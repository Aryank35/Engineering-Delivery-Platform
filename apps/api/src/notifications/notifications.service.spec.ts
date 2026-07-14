import { NotificationsService } from './notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RealtimeService } from '../realtime/realtime.service';

function makeService() {
  const prisma = {
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(),
  };
  const realtime = {
    emitNotification: jest.fn(),
    emitNotificationsRead: jest.fn(),
  };
  const service = new NotificationsService(
    prisma as unknown as PrismaService,
    realtime as unknown as RealtimeService,
  );
  return { service, prisma, realtime };
}

describe('NotificationsService.emit', () => {
  it('creates a notification and pushes it in real time', async () => {
    const { service, prisma, realtime } = makeService();
    await service.emit({
      userId: 'u2',
      type: 'WORK_ITEM_ASSIGNED',
      title: 'EOP-7 was assigned to you',
      link: '/work/w7',
      actorId: 'u1',
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(realtime.emitNotification).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ id: 'n1', type: 'WORK_ITEM_ASSIGNED' }),
    );
  });

  it('never notifies a user about their own action', async () => {
    const { service, prisma, realtime } = makeService();
    await service.emit({
      userId: 'u1',
      type: 'WORK_ITEM_ASSIGNED',
      title: 'self',
      actorId: 'u1',
    });
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(realtime.emitNotification).not.toHaveBeenCalled();
  });

  it('swallows persistence errors so the triggering action is unaffected', async () => {
    const { service, prisma } = makeService();
    prisma.notification.create.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.emit({ userId: 'u2', type: 'SYSTEM', title: 'x', actorId: 'u1' }),
    ).resolves.toBeUndefined();
  });
});

describe('NotificationsService.emitToMany', () => {
  it('dedupes recipients and excludes the actor', async () => {
    const { service, prisma } = makeService();
    await service.emitToMany(['a', 'a', 'b', 'u1', null, undefined], {
      type: 'COMMENT_ADDED',
      title: 'New comment',
      actorId: 'u1',
    });
    // 'a' and 'b' only — 'u1' is the actor, duplicates and nullish are dropped.
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    const recipients = prisma.notification.create.mock.calls.map(
      ([arg]: [{ data: { userId: string } }]) => arg.data.userId,
    );
    expect(new Set(recipients)).toEqual(new Set(['a', 'b']));
  });
});

describe('NotificationsService.markRead', () => {
  it('only marks the caller’s own notifications and signals other sessions', async () => {
    const { service, prisma, realtime } = makeService();
    prisma.notification.count.mockResolvedValue(3);
    const result = await service.markRead('u1', ['n1', 'n2']);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1', 'n2'] }, userId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(realtime.emitNotificationsRead).toHaveBeenCalledWith('u1');
    expect(result.count).toBe(3);
  });
});
