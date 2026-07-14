export interface GitHubBranchDto {
  id: string;
  repo: string;
  name: string;
  headSha: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface GitHubPullRequestDto {
  id: string;
  repo: string;
  number: number;
  title: string;
  url: string;
  state: string;
  merged: boolean;
  authorLogin: string | null;
  headBranch: string | null;
  baseBranch: string | null;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubCommitDto {
  id: string;
  repo: string;
  sha: string;
  shortSha: string;
  message: string;
  url: string | null;
  authorName: string | null;
  committedAt: string | null;
  createdAt: string;
}

/** All git activity linked to a single work item, for the "Development" panel. */
export interface WorkItemDevActivity {
  branches: GitHubBranchDto[];
  pullRequests: GitHubPullRequestDto[];
  commits: GitHubCommitDto[];
}

/** Read-only view of the integration's configuration state. */
export interface GitHubIntegrationStatus {
  configured: boolean;
  webhookPath: string;
  handledEvents: string[];
}
