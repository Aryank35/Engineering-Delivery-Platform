import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthUser } from '@eop/shared';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const makeContext = (user?: Partial<AuthUser>): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const makeReflector = (isPublic: boolean, required: string[] | undefined): Reflector =>
  ({
    getAllAndOverride: (key: string) => (key === IS_PUBLIC_KEY ? isPublic : required),
  }) as unknown as Reflector;

describe('PermissionsGuard', () => {
  it('allows public routes', () => {
    const guard = new PermissionsGuard(makeReflector(true, ['user:read']));
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows when no permissions are required', () => {
    const guard = new PermissionsGuard(makeReflector(false, undefined));
    expect(guard.canActivate(makeContext({ permissions: [] }))).toBe(true);
  });

  it('allows when the user holds all required permissions', () => {
    const guard = new PermissionsGuard(makeReflector(false, ['user:read', 'user:update']));
    const ctx = makeContext({ permissions: ['user:read', 'user:update', 'audit:read'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('forbids when a required permission is missing', () => {
    const guard = new PermissionsGuard(makeReflector(false, ['user:delete']));
    const ctx = makeContext({ permissions: ['user:read'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws Unauthorized when there is no authenticated user', () => {
    const guard = new PermissionsGuard(makeReflector(false, ['user:read']));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });
});
