import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { UsersService } from '../users/users.service';
import type { TokenService } from './token.service';
import type { HashingService } from '../security/hashing.service';
import type { AuditService } from '../audit/audit.service';
import type { AppConfigService } from '../config/app-config.service';

const buildUserRecord = () => ({
  id: 'user-1',
  email: 'dev@eop.dev',
  passwordHash: '$argon2id$hash',
  firstName: 'Dev',
  lastName: 'User',
  avatarUrl: null,
  timezone: null,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  roles: [{ role: { key: 'DEVELOPER' } }],
});

describe('AuthService.login', () => {
  const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

  const makeService = (overrides: {
    record?: ReturnType<typeof buildUserRecord> | null;
    passwordOk?: boolean;
  }) => {
    const users = {
      findByEmailWithSecret: jest.fn().mockResolvedValue(overrides.record ?? null),
      recordLogin: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const tokens = {
      signAccessToken: jest.fn().mockResolvedValue('access-token'),
      issueRefreshToken: jest
        .fn()
        .mockResolvedValue({ token: 'refresh-token', expiresAt: new Date() }),
    } as unknown as TokenService;
    const hashing = {
      verify: jest.fn().mockResolvedValue(overrides.passwordOk ?? false),
      hash: jest.fn().mockResolvedValue('$argon2id$dummy'),
    } as unknown as HashingService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const config = { jwt: { accessTtlSec: 900 } } as unknown as AppConfigService;

    return {
      service: new AuthService(users, tokens, hashing, audit, config),
      users,
      tokens,
      hashing,
    };
  };

  it('issues a session for valid credentials', async () => {
    const { service, tokens } = makeService({ record: buildUserRecord(), passwordOk: true });

    const { result, refreshToken } = await service.login(
      { email: 'dev@eop.dev', password: 'Secret123!' },
      ctx,
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.email).toBe('dev@eop.dev');
    expect(result.user.roles).toEqual(['DEVELOPER']);
    // Permissions are derived from roles for the client.
    expect(result.user.permissions).toContain('user:read');
    expect(refreshToken.token).toBe('refresh-token');
    expect(tokens.issueRefreshToken).toHaveBeenCalledWith('user-1', ctx);
  });

  it('rejects an unknown email with a generic error', async () => {
    const { service, hashing } = makeService({ record: null });
    await expect(
      service.login({ email: 'nobody@eop.dev', password: 'x' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    // Still performs a verify to equalise timing.
    expect(hashing.verify).toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    const { service } = makeService({ record: buildUserRecord(), passwordOk: false });
    await expect(
      service.login({ email: 'dev@eop.dev', password: 'wrong' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a deactivated account', async () => {
    const record = { ...buildUserRecord(), isActive: false };
    const { service } = makeService({ record, passwordOk: true });
    await expect(
      service.login({ email: 'dev@eop.dev', password: 'Secret123!' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
