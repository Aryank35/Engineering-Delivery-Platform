import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprintAnalytics } from './use-sprints';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function SprintAnalyticsPanel({ sprintId }: { sprintId: string }) {
  const { data, isLoading } = useSprintAnalytics(sprintId);
  if (isLoading || !data) return <Skeleton className="h-28 w-full" />;

  const pct = data.totalPoints > 0 ? Math.round((data.completedPoints / data.totalPoints) * 100) : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Items"
            value={`${data.completedCount}/${data.itemCount}`}
            sub="completed"
          />
          <Stat
            label="Points"
            value={`${data.completedPoints}/${data.totalPoints}`}
            sub={`${data.remainingPoints} remaining`}
          />
          <Stat label="Working days" value={`${data.daysRemaining}`} sub={`of ${data.workingDays} left`} />
          <Stat label="Progress" value={`${pct}%`} sub="by points" />
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        {data.perAssignee.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Load by assignee
            </p>
            <ul className="space-y-1 text-sm">
              {data.perAssignee.map((load, i) => (
                <li key={load.assignee?.id ?? `unassigned-${i}`} className="flex justify-between">
                  <span>{load.assignee?.fullName ?? 'Unassigned'}</span>
                  <span className="text-muted-foreground">
                    {load.completedPoints}/{load.points} pts
                    {load.capacityHours > 0 ? ` · ${load.capacityHours}h capacity` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
