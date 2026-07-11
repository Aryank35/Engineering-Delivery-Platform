import { Link } from 'react-router-dom';
import { SPRINT_STATUS_META, PERMISSIONS, type SprintStatus } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { CreateSprintDialog } from './create-sprint-dialog';
import { useSprints, useSprintsRealtime } from './use-sprints';

const STATUS_VARIANT: Record<SprintStatus, 'secondary' | 'success' | 'muted'> = {
  PLANNED: 'secondary',
  ACTIVE: 'success',
  COMPLETED: 'muted',
};

export function SprintsPage() {
  useSprintsRealtime();
  const { data, isLoading, isError } = useSprints({ pageSize: 50, order: 'desc' });
  const sprints = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Sprints"
        description="Plan and track time-boxed iterations."
        actions={
          <PermissionGate permission={PERMISSIONS.SPRINT_MANAGE}>
            <CreateSprintDialog />
          </PermissionGate>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-destructive">Failed to load sprints.</p>
      ) : sprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sprints yet. Create one to start planning.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sprints.map((sprint) => (
            <Card key={sprint.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{sprint.name}</h3>
                  <Badge variant={STATUS_VARIANT[sprint.status]}>
                    {SPRINT_STATUS_META[sprint.status].label}
                  </Badge>
                </div>
                {sprint.goal ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{sprint.goal}</p>
                ) : null}
                <div className="mt-auto space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                    </span>
                    <span>
                      {sprint.itemCount} item{sprint.itemCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/sprints/${sprint.id}`}>Open board</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
