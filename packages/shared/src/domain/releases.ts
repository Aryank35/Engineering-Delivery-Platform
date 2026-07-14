/**
 * Release & deployment vocabulary. Values mirror the Prisma `ReleaseStatus` and
 * `DeploymentStatus` enums exactly so the same strings flow through the API, the
 * database and the web client.
 */
export const RELEASE_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'RELEASED',
  'ROLLED_BACK',
  'CANCELLED',
] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

/** Tone values are exactly the UI Badge variants, so the web maps them 1:1. */
export type BadgeTone = 'default' | 'secondary' | 'success' | 'destructive' | 'muted' | 'outline';

export interface ReleaseStatusMeta {
  label: string;
  tone: BadgeTone;
}

export const RELEASE_STATUS_META: Record<ReleaseStatus, ReleaseStatusMeta> = {
  PLANNED: { label: 'Planned', tone: 'secondary' },
  IN_PROGRESS: { label: 'In progress', tone: 'default' },
  RELEASED: { label: 'Released', tone: 'success' },
  ROLLED_BACK: { label: 'Rolled back', tone: 'destructive' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
};

export const DEPLOYMENT_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED',
  'ROLLED_BACK',
] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export interface DeploymentStatusMeta {
  label: string;
  tone: BadgeTone;
}

export const DEPLOYMENT_STATUS_META: Record<DeploymentStatus, DeploymentStatusMeta> = {
  PENDING: { label: 'Pending', tone: 'secondary' },
  IN_PROGRESS: { label: 'In progress', tone: 'default' },
  SUCCEEDED: { label: 'Succeeded', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'destructive' },
  ROLLED_BACK: { label: 'Rolled back', tone: 'muted' },
};

/** A deployment counts as "live" (currently running in the environment) when succeeded. */
export const isLiveDeploymentStatus = (status: DeploymentStatus): boolean => status === 'SUCCEEDED';

export const isReleaseStatus = (value: unknown): value is ReleaseStatus =>
  typeof value === 'string' && (RELEASE_STATUSES as readonly string[]).includes(value);

export const isDeploymentStatus = (value: unknown): value is DeploymentStatus =>
  typeof value === 'string' && (DEPLOYMENT_STATUSES as readonly string[]).includes(value);
