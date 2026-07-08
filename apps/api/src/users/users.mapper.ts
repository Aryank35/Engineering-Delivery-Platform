import { type Prisma } from '@eop/database';
import type { AuthUser, PermissionKey, PublicUser, RoleKey } from '@eop/shared';

/** Include shape for producing a {@link PublicUser} (roles only). */
export const PUBLIC_USER_INCLUDE = {
  roles: { include: { role: true } },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof PUBLIC_USER_INCLUDE }>;

/** Include shape for producing an {@link AuthUser} (roles + their permissions). */
export const AUTH_USER_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserInclude;

export type UserWithPermissions = Prisma.UserGetPayload<{ include: typeof AUTH_USER_INCLUDE }>;

export function toPublicUser(user: UserWithRoles): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    isActive: user.isActive,
    roles: user.roles.map((assignment) => assignment.role.key as RoleKey),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAuthUser(user: UserWithPermissions): AuthUser {
  const roles = user.roles.map((assignment) => assignment.role.key as RoleKey);
  const permissions = [
    ...new Set(
      user.roles.flatMap((assignment) =>
        assignment.role.permissions.map((rp) => rp.permission.key as PermissionKey),
      ),
    ),
  ];
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    permissions,
  };
}
