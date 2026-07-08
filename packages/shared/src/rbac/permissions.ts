import type { RoleKey } from './roles';

/**
 * Fine-grained permissions expressed as `resource:action`. Guards check these
 * strings; roles are simply named bundles of them. New modules add entries here
 * and to {@link ROLE_PERMISSIONS} as they land.
 */
export const PERMISSIONS = {
  // Users & RBAC (Phase 1)
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ASSIGN_ROLES: 'user:assign_roles',
  ROLE_READ: 'role:read',

  // Audit (Phase 1)
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export interface PermissionMeta {
  key: PermissionKey;
  resource: string;
  action: string;
  description: string;
}

const meta = (key: PermissionKey, description: string): PermissionMeta => {
  const [resource, action] = key.split(':');
  return { key, resource, action, description };
};

export const PERMISSION_CATALOG: PermissionMeta[] = [
  meta(PERMISSIONS.USER_READ, 'View users'),
  meta(PERMISSIONS.USER_CREATE, 'Create users'),
  meta(PERMISSIONS.USER_UPDATE, 'Update users'),
  meta(PERMISSIONS.USER_DELETE, 'Deactivate users'),
  meta(PERMISSIONS.USER_ASSIGN_ROLES, 'Assign roles to users'),
  meta(PERMISSIONS.ROLE_READ, 'View roles'),
  meta(PERMISSIONS.AUDIT_READ, 'View audit logs'),
];

/**
 * Role → permission mapping seeded into the database. `ADMIN` implicitly holds
 * every permission.
 */
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  ENGINEERING_MANAGER: [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_READ, PERMISSIONS.AUDIT_READ],
  BUSINESS_ANALYST: [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_READ],
  DEVELOPER: [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_READ],
  QA_ENGINEER: [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_READ],
  VIEWER: [PERMISSIONS.USER_READ],
};

/** Resolve the effective permission set for a collection of roles. */
export const permissionsForRoles = (roles: RoleKey[]): PermissionKey[] => {
  const set = new Set<PermissionKey>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      set.add(permission);
    }
  }
  return [...set];
};
