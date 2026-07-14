import type { DeploymentStatus, ReleaseStatus } from '../domain/releases';
import type { UserRef, WorkItemSummary } from './work-items';

export interface EnvironmentDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  isProduction: boolean;
  createdAt: string;
}

/** A compact reference to an environment, embedded in deployments. */
export interface EnvironmentRef {
  id: string;
  key: string;
  name: string;
  color: string;
  isProduction: boolean;
}

export interface DeploymentDto {
  id: string;
  releaseId: string;
  environment: EnvironmentRef;
  status: DeploymentStatus;
  notes: string | null;
  deployedBy: UserRef | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseSummary {
  id: string;
  version: string;
  name: string | null;
  status: ReleaseStatus;
  targetDate: string | null;
  releasedAt: string | null;
  itemCount: number;
  createdBy: UserRef | null;
  /** Environments this release is currently live in (latest deployment succeeded). */
  liveEnvironments: EnvironmentRef[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseDetail extends ReleaseSummary {
  notes: string | null;
  workItems: WorkItemSummary[];
  deployments: DeploymentDto[];
}

/** The state of one environment: the release currently live there, if any. */
export interface EnvironmentStatusDto {
  environment: EnvironmentRef;
  currentRelease: {
    id: string;
    version: string;
    name: string | null;
    deployedAt: string | null;
    deployedBy: UserRef | null;
  } | null;
}
