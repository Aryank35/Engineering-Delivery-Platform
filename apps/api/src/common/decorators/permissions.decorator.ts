import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@eop/shared';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Requires the caller to hold all of the given fine-grained permissions. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
