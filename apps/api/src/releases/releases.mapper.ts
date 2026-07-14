import { Prisma } from '@eop/database';
import {
  type DeploymentDto,
  type DeploymentStatus,
  type EnvironmentDto,
  type EnvironmentRef,
  type EnvironmentStatusDto,
  type ReleaseDetail,
  type ReleaseStatus,
  type ReleaseSummary,
} from '@eop/shared';
import { SUMMARY_INCLUDE, USER_REF_SELECT, toSummary, toUserRef } from '../work-items/work-items.mapper';

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

export const DEPLOYMENT_INCLUDE = {
  environment: true,
  deployedBy: { select: USER_REF_SELECT },
} satisfies Prisma.DeploymentInclude;

export const RELEASE_SUMMARY_INCLUDE = {
  createdBy: { select: USER_REF_SELECT },
  _count: { select: { workItems: true } },
  deployments: { include: DEPLOYMENT_INCLUDE, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.ReleaseInclude;

export const RELEASE_DETAIL_INCLUDE = {
  ...RELEASE_SUMMARY_INCLUDE,
  workItems: { include: SUMMARY_INCLUDE, orderBy: { number: 'asc' } },
} satisfies Prisma.ReleaseInclude;

export type EnvironmentRow = Prisma.EnvironmentGetPayload<Record<string, never>>;
export type DeploymentRow = Prisma.DeploymentGetPayload<{ include: typeof DEPLOYMENT_INCLUDE }>;
export type ReleaseSummaryRow = Prisma.ReleaseGetPayload<{ include: typeof RELEASE_SUMMARY_INCLUDE }>;
export type ReleaseDetailRow = Prisma.ReleaseGetPayload<{ include: typeof RELEASE_DETAIL_INCLUDE }>;

export function toEnvironment(row: EnvironmentRow): EnvironmentDto {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sortOrder,
    isProduction: row.isProduction,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toEnvironmentRef(row: {
  id: string;
  key: string;
  name: string;
  color: string;
  isProduction: boolean;
}): EnvironmentRef {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    color: row.color,
    isProduction: row.isProduction,
  };
}

export function toDeployment(row: DeploymentRow): DeploymentDto {
  return {
    id: row.id,
    releaseId: row.releaseId,
    environment: toEnvironmentRef(row.environment),
    status: row.status as DeploymentStatus,
    notes: row.notes,
    deployedBy: toUserRef(row.deployedBy),
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Environments where this release is currently live: the *latest* deployment to
 * the environment succeeded. Deployments must be pre-sorted newest-first.
 */
function liveEnvironments(deployments: DeploymentRow[]): EnvironmentRef[] {
  const latestByEnv = new Map<string, DeploymentRow>();
  for (const dep of deployments) {
    if (!latestByEnv.has(dep.environmentId)) latestByEnv.set(dep.environmentId, dep);
  }
  return [...latestByEnv.values()]
    .filter((dep) => dep.status === 'SUCCEEDED')
    .map((dep) => toEnvironmentRef(dep.environment))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toReleaseSummary(row: ReleaseSummaryRow): ReleaseSummary {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    status: row.status as ReleaseStatus,
    targetDate: iso(row.targetDate),
    releasedAt: iso(row.releasedAt),
    itemCount: row._count.workItems,
    createdBy: toUserRef(row.createdBy),
    liveEnvironments: liveEnvironments(row.deployments),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toReleaseDetail(row: ReleaseDetailRow): ReleaseDetail {
  return {
    ...toReleaseSummary(row),
    notes: row.notes,
    workItems: row.workItems.map(toSummary),
    deployments: row.deployments.map(toDeployment),
  };
}

export function toEnvironmentStatus(
  env: EnvironmentRow,
  latestLive:
    | (DeploymentRow & { release: { id: string; version: string; name: string | null } })
    | null,
): EnvironmentStatusDto {
  return {
    environment: toEnvironmentRef(env),
    currentRelease: latestLive
      ? {
          id: latestLive.release.id,
          version: latestLive.release.version,
          name: latestLive.release.name,
          deployedAt: iso(latestLive.finishedAt ?? latestLive.createdAt),
          deployedBy: toUserRef(latestLive.deployedBy),
        }
      : null,
  };
}
