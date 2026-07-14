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

  // Work items (Phase 2)
  WORKITEM_READ: 'workitem:read',
  WORKITEM_CREATE: 'workitem:create',
  WORKITEM_UPDATE: 'workitem:update',
  WORKITEM_DELETE: 'workitem:delete',

  // Comments (Phase 2)
  COMMENT_CREATE: 'comment:create',
  COMMENT_MODERATE: 'comment:moderate',

  // Labels (Phase 2)
  LABEL_READ: 'label:read',
  LABEL_MANAGE: 'label:manage',

  // Sprints & board (Phase 3)
  SPRINT_READ: 'sprint:read',
  SPRINT_MANAGE: 'sprint:manage',

  // Time tracking (Phase 4)
  TIME_READ: 'time:read',
  TIME_LOG: 'time:log',

  // Analytics & dashboards (Phase 5)
  ANALYTICS_READ: 'analytics:read',

  // Notifications (Phase 6) — self-scoped: read and manage your own notifications.
  NOTIFICATION_READ: 'notification:read',

  // Releases & environments (Phase 6)
  RELEASE_READ: 'release:read',
  RELEASE_MANAGE: 'release:manage',

  // Integrations (Phase 6) — GitHub and future connectors.
  INTEGRATION_MANAGE: 'integration:manage',
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
  meta(PERMISSIONS.WORKITEM_READ, 'View work items'),
  meta(PERMISSIONS.WORKITEM_CREATE, 'Create work items'),
  meta(PERMISSIONS.WORKITEM_UPDATE, 'Update work items'),
  meta(PERMISSIONS.WORKITEM_DELETE, 'Delete work items'),
  meta(PERMISSIONS.COMMENT_CREATE, 'Add comments'),
  meta(PERMISSIONS.COMMENT_MODERATE, "Edit or delete others' comments"),
  meta(PERMISSIONS.LABEL_READ, 'View labels'),
  meta(PERMISSIONS.LABEL_MANAGE, 'Create, edit and delete labels'),
  meta(PERMISSIONS.SPRINT_READ, 'View sprints and boards'),
  meta(PERMISSIONS.SPRINT_MANAGE, 'Create, plan, start and complete sprints'),
  meta(PERMISSIONS.TIME_READ, 'View time logs'),
  meta(PERMISSIONS.TIME_LOG, 'Track and log time'),
  meta(PERMISSIONS.ANALYTICS_READ, 'View analytics dashboards'),
  meta(PERMISSIONS.NOTIFICATION_READ, 'Receive and manage your own notifications'),
  meta(PERMISSIONS.RELEASE_READ, 'View releases, environments and deployments'),
  meta(PERMISSIONS.RELEASE_MANAGE, 'Create and manage releases, environments and deployments'),
  meta(PERMISSIONS.INTEGRATION_MANAGE, 'View and manage integrations (GitHub, …)'),
];

const {
  USER_READ,
  ROLE_READ,
  AUDIT_READ,
  WORKITEM_READ,
  WORKITEM_CREATE,
  WORKITEM_UPDATE,
  WORKITEM_DELETE,
  COMMENT_CREATE,
  COMMENT_MODERATE,
  LABEL_READ,
  LABEL_MANAGE,
  SPRINT_READ,
  SPRINT_MANAGE,
  TIME_READ,
  TIME_LOG,
  ANALYTICS_READ,
  NOTIFICATION_READ,
  RELEASE_READ,
  RELEASE_MANAGE,
  INTEGRATION_MANAGE,
} = PERMISSIONS;

/**
 * Role → permission mapping seeded into the database. `ADMIN` implicitly holds
 * every permission.
 */
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  ENGINEERING_MANAGER: [
    USER_READ,
    ROLE_READ,
    AUDIT_READ,
    WORKITEM_READ,
    WORKITEM_CREATE,
    WORKITEM_UPDATE,
    WORKITEM_DELETE,
    COMMENT_CREATE,
    COMMENT_MODERATE,
    LABEL_READ,
    LABEL_MANAGE,
    SPRINT_READ,
    SPRINT_MANAGE,
    TIME_READ,
    TIME_LOG,
    ANALYTICS_READ,
    NOTIFICATION_READ,
    RELEASE_READ,
    RELEASE_MANAGE,
    INTEGRATION_MANAGE,
  ],
  BUSINESS_ANALYST: [
    USER_READ,
    ROLE_READ,
    WORKITEM_READ,
    WORKITEM_CREATE,
    WORKITEM_UPDATE,
    COMMENT_CREATE,
    LABEL_READ,
    SPRINT_READ,
    TIME_READ,
    TIME_LOG,
    ANALYTICS_READ,
    NOTIFICATION_READ,
    RELEASE_READ,
  ],
  DEVELOPER: [
    USER_READ,
    ROLE_READ,
    WORKITEM_READ,
    WORKITEM_CREATE,
    WORKITEM_UPDATE,
    COMMENT_CREATE,
    LABEL_READ,
    SPRINT_READ,
    TIME_READ,
    TIME_LOG,
    NOTIFICATION_READ,
    RELEASE_READ,
  ],
  QA_ENGINEER: [
    USER_READ,
    ROLE_READ,
    WORKITEM_READ,
    WORKITEM_UPDATE,
    COMMENT_CREATE,
    LABEL_READ,
    SPRINT_READ,
    TIME_READ,
    TIME_LOG,
    ANALYTICS_READ,
    NOTIFICATION_READ,
    RELEASE_READ,
  ],
  VIEWER: [
    USER_READ,
    WORKITEM_READ,
    LABEL_READ,
    SPRINT_READ,
    TIME_READ,
    NOTIFICATION_READ,
    RELEASE_READ,
  ],
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
