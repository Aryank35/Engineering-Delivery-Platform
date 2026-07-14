import { GitBranch, GitCommitHorizontal, GitPullRequest } from 'lucide-react';
import type { GitHubPullRequestDto } from '@eop/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import { useWorkItemDevActivity } from './use-github';

export function prBadge(
  pr: Pick<GitHubPullRequestDto, 'merged' | 'state'>,
): { label: string; variant: 'success' | 'muted' | 'default' } {
  if (pr.merged) return { label: 'Merged', variant: 'success' };
  if (pr.state === 'closed') return { label: 'Closed', variant: 'muted' };
  return { label: 'Open', variant: 'default' };
}

export function WorkItemDevPanel({ workItemId }: { workItemId: string }) {
  const { data, isLoading } = useWorkItemDevActivity(workItemId);

  const branches = data?.branches ?? [];
  const pullRequests = data?.pullRequests ?? [];
  const commits = data?.commits ?? [];
  const isEmpty = branches.length === 0 && pullRequests.length === 0 && commits.length === 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm font-semibold">Development</p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground">
            No linked branches, pull requests or commits yet. Reference{' '}
            <span className="font-mono">this item&apos;s key</span> in a branch name, commit or PR
            to link it automatically.
          </p>
        ) : (
          <div className="space-y-4">
            {pullRequests.length > 0 ? (
              <div className="space-y-1.5">
                {pullRequests.map((pr) => {
                  const badge = prBadge(pr);
                  return (
                    <a
                      key={pr.id}
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
                    >
                      <GitPullRequest className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-xs text-muted-foreground">#{pr.number}</span>
                      <span className="flex-1 truncate">{pr.title}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </a>
                  );
                })}
              </div>
            ) : null}

            {branches.length > 0 ? (
              <div className="space-y-1.5">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center gap-2 px-1 text-sm text-muted-foreground"
                  >
                    <GitBranch className="h-4 w-4 shrink-0" />
                    <span className={branch.deletedAt ? 'font-mono line-through' : 'font-mono'}>
                      {branch.name}
                    </span>
                    {branch.deletedAt ? (
                      <span className="text-[11px]">deleted</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {commits.length > 0 ? (
              <div className="space-y-1.5">
                {commits.slice(0, 8).map((commit) => (
                  <div key={commit.id} className="flex items-start gap-2 px-1 text-sm">
                    <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {commit.shortSha}
                    </span>
                    <span className="flex-1 truncate">{commit.message.split('\n')[0]}</span>
                    {commit.committedAt ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(commit.committedAt)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
