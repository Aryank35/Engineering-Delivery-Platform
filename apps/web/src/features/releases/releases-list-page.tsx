import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { PERMISSIONS, RELEASE_STATUSES, RELEASE_STATUS_META, type ListReleasesQuery } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';
import { CreateReleaseDialog } from './create-release-dialog';
import { EnvironmentStatusOverview } from './environment-status-overview';
import { ReleaseStatusBadge } from './status-badge';
import { useReleases, useReleasesRealtime } from './use-releases';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ReleasesListPage() {
  useReleasesRealtime();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const query: Partial<ListReleasesQuery> = {
    page,
    pageSize: 15,
    order: 'desc',
    ...(status ? { status: status as ListReleasesQuery['status'] } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, isError } = useReleases(query);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <PageHeader
        title="Releases"
        description="Plan versioned releases and track where they are deployed."
        actions={
          <PermissionGate permission={PERMISSIONS.RELEASE_MANAGE}>
            <CreateReleaseDialog />
          </PermissionGate>
        }
      />

      <EnvironmentStatusOverview />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All releases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search version or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {RELEASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {RELEASE_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Live in</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    Failed to load releases.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No releases yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>
                      <Link
                        to={`/releases/${release.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <Rocket className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{release.version}</span>
                        {release.name ? (
                          <span className="text-muted-foreground">· {release.name}</span>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ReleaseStatusBadge status={release.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {release.itemCount}
                    </TableCell>
                    <TableCell>
                      {release.liveEnvironments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {release.liveEnvironments.map((env) => (
                            <span
                              key={env.id}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                              )}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: env.color }}
                              />
                              {env.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(release.targetDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta ? (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>
                {meta.total} release{meta.total === 1 ? '' : 's'} · page {meta.page} of{' '}
                {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
