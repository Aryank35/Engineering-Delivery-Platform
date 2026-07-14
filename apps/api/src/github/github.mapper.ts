import { Prisma } from '@eop/database';
import type { GitHubBranchDto, GitHubCommitDto, GitHubPullRequestDto } from '@eop/shared';

export type BranchRow = Prisma.GitHubBranchGetPayload<Record<string, never>>;
export type PullRequestRow = Prisma.GitHubPullRequestGetPayload<Record<string, never>>;
export type CommitRow = Prisma.GitHubCommitGetPayload<Record<string, never>>;

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

export function toBranch(row: BranchRow): GitHubBranchDto {
  return {
    id: row.id,
    repo: row.repo,
    name: row.name,
    headSha: row.headSha,
    deletedAt: iso(row.deletedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPullRequest(row: PullRequestRow): GitHubPullRequestDto {
  return {
    id: row.id,
    repo: row.repo,
    number: row.number,
    title: row.title,
    url: row.url,
    state: row.state,
    merged: row.merged,
    authorLogin: row.authorLogin,
    headBranch: row.headBranch,
    baseBranch: row.baseBranch,
    mergedAt: iso(row.mergedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCommit(row: CommitRow): GitHubCommitDto {
  return {
    id: row.id,
    repo: row.repo,
    sha: row.sha,
    shortSha: row.sha.slice(0, 7),
    message: row.message,
    url: row.url,
    authorName: row.authorName,
    committedAt: iso(row.committedAt),
    createdAt: row.createdAt.toISOString(),
  };
}
