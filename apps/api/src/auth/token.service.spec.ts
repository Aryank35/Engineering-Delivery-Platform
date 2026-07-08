import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import type { AppConfigService } from '../config/app-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { HashingService } from '../security/hashing.service';

const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

const makeService = (record: Record<string, unknown> | null) => {
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'u', family: 'f', jti: 'j', type: 'refresh' }),
    signAsync: jest.fn().mockResolvedValue('new-token'),
  } as unknown as JwtService;

  const refreshToken = {
    findUnique: jest.fn().mockResolvedValue(record),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { refreshToken } as unknown as PrismaService;

  const hashing = {
    sha256: jest.fn((value: string) => `hash:${value}`),
  } as unknown as HashingService;

  const config = {
    jwt: { refreshSecret: 's', refreshTtlSec: 604800, accessSecret: 'a', accessTtlSec: 900 },
  } as unknown as AppConfigService;

  return { service: new TokenService(jwt, config, prisma, hashing), prisma, refreshToken };
};

describe('TokenService.rotateRefreshToken', () => {
  const future = new Date(Date.now() + 60_000);

  it('rotates a valid token', async () => {
    const { service, refreshToken } = makeService({
      id: 'j',
      userId: 'u',
      family: 'f',
      tokenHash: 'hash:valid',
      revokedAt: null,
      expiresAt: future,
    });

    const { userId, refreshToken: issued } = await service.rotateRefreshToken('valid', ctx);

    expect(userId).toBe('u');
    expect(issued.token).toBe('new-token');
    expect(refreshToken.create).toHaveBeenCalled();
    expect(refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'j' } }),
    );
  });

  it('revokes the whole family when a revoked token is reused', async () => {
    const { service, refreshToken } = makeService({
      id: 'j',
      userId: 'u',
      family: 'f',
      tokenHash: 'hash:valid',
      revokedAt: new Date(),
      expiresAt: future,
    });

    await expect(service.rotateRefreshToken('valid', ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { family: 'f', revokedAt: null } }),
    );
  });

  it('rejects a token whose stored hash does not match', async () => {
    const { service } = makeService({
      id: 'j',
      userId: 'u',
      family: 'f',
      tokenHash: 'hash:different',
      revokedAt: null,
      expiresAt: future,
    });
    await expect(service.rotateRefreshToken('valid', ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const { service } = makeService({
      id: 'j',
      userId: 'u',
      family: 'f',
      tokenHash: 'hash:valid',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.rotateRefreshToken('valid', ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
