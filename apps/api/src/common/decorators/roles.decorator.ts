import { SetMetadata } from '@nestjs/common';
import type { RoleKey } from '@eop/shared';

export const ROLES_KEY = 'requiredRoles';

/** Requires the caller to hold at least one of the given roles. */
export const Roles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);
