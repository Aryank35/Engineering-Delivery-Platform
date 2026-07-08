/**
 * Canonical role catalogue. Values mirror the Prisma `RoleKey` enum exactly so
 * the same strings flow through the API, the database and the web client.
 */
export const ROLE_KEYS = [
  'ADMIN',
  'ENGINEERING_MANAGER',
  'BUSINESS_ANALYST',
  'DEVELOPER',
  'QA_ENGINEER',
  'VIEWER',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const isRoleKey = (value: unknown): value is RoleKey =>
  typeof value === 'string' && (ROLE_KEYS as readonly string[]).includes(value);

export interface RoleMeta {
  key: RoleKey;
  name: string;
  description: string;
  /** Higher rank = more authority. Used for display ordering, not authorization. */
  rank: number;
}

export const ROLE_METADATA: Record<RoleKey, RoleMeta> = {
  ADMIN: {
    key: 'ADMIN',
    name: 'Admin',
    description: 'Full platform access including user and role administration.',
    rank: 100,
  },
  ENGINEERING_MANAGER: {
    key: 'ENGINEERING_MANAGER',
    name: 'Engineering Manager',
    description: 'Manages teams, sprints, releases and reporting.',
    rank: 80,
  },
  BUSINESS_ANALYST: {
    key: 'BUSINESS_ANALYST',
    name: 'Business Analyst',
    description: 'Owns requirements and backlog grooming.',
    rank: 60,
  },
  DEVELOPER: {
    key: 'DEVELOPER',
    name: 'Developer',
    description: 'Implements work items and logs time.',
    rank: 50,
  },
  QA_ENGINEER: {
    key: 'QA_ENGINEER',
    name: 'QA Engineer',
    description: 'Verifies work items and tracks defects.',
    rank: 40,
  },
  VIEWER: {
    key: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access to dashboards and boards.',
    rank: 10,
  },
};

/** The role assigned to self-registered users (least privilege). */
export const DEFAULT_SELF_SIGNUP_ROLE: RoleKey = 'VIEWER';
