import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Rocket, Trash2, X } from 'lucide-react';
import {
  DEPLOYMENT_STATUSES,
  DEPLOYMENT_STATUS_META,
  PERMISSIONS,
  RELEASE_STATUSES,
  RELEASE_STATUS_META,
  type DeploymentStatus,
  type ReleaseStatus,
} from '@eop/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/permission-gate';
import { StatusBadge, TypeIcon } from '@/features/work-items/work-item-badges';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { AddReleaseItemsDialog } from './add-release-items-dialog';
import { DeployDialog } from './deploy-dialog';
import { DeploymentStatusBadge, ReleaseStatusBadge } from './status-badge';
import {
  useDeleteRelease,
  useDeployRelease,
  useRelease,
  useReleaseItems,
  useReleasesRealtime,
  useSetReleaseStatus,
  useUpdateDeployment,
} from './use-releases';

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const releaseId = id ?? '';
  const navigate = useNavigate();
  useReleasesRealtime();

  const { data: release, isLoading, isError } = useRelease(releaseId);
  const setStatus = useSetReleaseStatus(releaseId);
  const del = useDeleteRelease(() => navigate('/releases'));
  const { remove } = useReleaseItems(releaseId);
  const updateDeployment = useUpdateDeployment(releaseId);
  const deploy = useDeployRelease(releaseId);

  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.RELEASE_MANAGE));

  if (isLoading) return <FullPageSpinner label="Loading release…" />;
  if (isError || !release) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Release not found.{' '}
        <Link to="/releases" className="text-primary hover:underline">
          Back to releases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/releases" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Releases
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{release.version}</h1>
            <ReleaseStatusBadge status={release.status} />
          </div>
          {release.name ? <p className="mt-1 text-muted-foreground">{release.name}</p> : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {release.createdBy ? `Created by ${release.createdBy.fullName}` : 'Created'}
            {release.targetDate ? ` · Target ${formatDate(release.targetDate)}` : ''}
            {release.releasedAt ? ` · Released ${formatDate(release.releasedAt)}` : ''}
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.RELEASE_MANAGE}>
          <div className="flex items-center gap-2">
            <select
              className={`${selectClass} h-9 text-sm`}
              value={release.status}
              disabled={setStatus.isPending}
              onChange={(e) => setStatus.mutate(e.target.value as ReleaseStatus)}
              aria-label="Release status"
            >
              {RELEASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {RELEASE_STATUS_META[s].label}
                </option>
              ))}
            </select>
            <DeployDialog
              releaseId={releaseId}
              trigger={
                <Button size="sm" disabled={deploy.isPending}>
                  <Rocket className="h-4 w-4" /> Deploy
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label="Delete release"
              onClick={() => {
                if (window.confirm(`Delete release ${release.version}?`)) del.mutate(releaseId);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </PermissionGate>
      </div>

      {release.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Release notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{release.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Work items ({release.workItems.length})</CardTitle>
            <PermissionGate permission={PERMISSIONS.RELEASE_MANAGE}>
              <AddReleaseItemsDialog releaseId={releaseId} />
            </PermissionGate>
          </CardHeader>
          <CardContent>
            {release.workItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No work items in this release yet.
              </p>
            ) : (
              <ul className="divide-y">
                {release.workItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                    <TypeIcon type={item.type} />
                    <Link
                      to={`/work/${item.id}`}
                      className="font-mono text-xs text-muted-foreground hover:underline"
                    >
                      {item.key}
                    </Link>
                    <span className="flex-1 truncate">{item.title}</span>
                    <StatusBadge status={item.status} />
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        aria-label="Remove from release"
                        onClick={() => remove.mutate({ itemIds: [item.id] })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deployments ({release.deployments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {release.deployments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No deployments recorded.
              </p>
            ) : (
              <ul className="space-y-3">
                {release.deployments.map((dep) => (
                  <li key={dep.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: dep.environment.color }}
                        />
                        {dep.environment.name}
                      </span>
                      {canManage ? (
                        <select
                          className={selectClass}
                          value={dep.status}
                          disabled={updateDeployment.isPending}
                          onChange={(e) =>
                            updateDeployment.mutate({
                              deploymentId: dep.id,
                              input: { status: e.target.value as DeploymentStatus },
                            })
                          }
                          aria-label="Deployment status"
                        >
                          {DEPLOYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {DEPLOYMENT_STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <DeploymentStatusBadge status={dep.status} />
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {formatDateTime(dep.finishedAt ?? dep.createdAt)}
                      {dep.deployedBy ? ` · ${dep.deployedBy.fullName}` : ''}
                    </p>
                    {dep.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{dep.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
