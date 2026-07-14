import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '@eop/shared';
import { EnvironmentsService } from './environments.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';

const actor: AuthUser = {
  id: 'u1',
  email: 'em@eop.dev',
  firstName: 'Eng',
  lastName: 'Manager',
  roles: ['ENGINEERING_MANAGER'],
  permissions: ['release:manage'],
};
const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

function makeService() {
  const prisma = {
    environment: { findUnique: jest.fn(), delete: jest.fn() },
    deployment: { count: jest.fn() },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emitReleasesChanged: jest.fn() };
  const service = new EnvironmentsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    realtime as unknown as RealtimeService,
  );
  return { service, prisma };
}

describe('EnvironmentsService.remove', () => {
  it('refuses to delete an environment that has deployments', async () => {
    const { service, prisma } = makeService();
    prisma.environment.findUnique.mockResolvedValue({ id: 'e1', key: 'production', name: 'Production' });
    prisma.deployment.count.mockResolvedValue(3);

    await expect(service.remove('e1', actor, ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.environment.delete).not.toHaveBeenCalled();
  });

  it('deletes an environment with no deployments', async () => {
    const { service, prisma } = makeService();
    prisma.environment.findUnique.mockResolvedValue({ id: 'e1', key: 'dev', name: 'Development' });
    prisma.deployment.count.mockResolvedValue(0);
    prisma.environment.delete.mockResolvedValue({});

    const result = await service.remove('e1', actor, ctx);
    expect(result).toEqual({ success: true });
    expect(prisma.environment.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });
});
