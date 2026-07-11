import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardList, Clock, Timer } from 'lucide-react';
import {
  formatClock,
  formatDuration,
  WORK_ITEM_STATUS_META,
  type WorkItemStatus,
} from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveTimer, useLiveElapsed, useTimeSummary } from '@/features/time/use-time';

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Clock;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: summary, isLoading } = useTimeSummary();
  const { data: timer } = useActiveTimer();
  const elapsed = useLiveElapsed(timer ?? null);

  if (!user) return null;

  const maxDay = summary ? Math.max(1, ...summary.weekByDay.map((d) => d.seconds)) : 1;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        description="Your day at a glance — time, timers and assigned work."
      />

      {isLoading || !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Today"
              value={formatDuration(summary.todaySeconds)}
              sub="logged"
              icon={Clock}
            />
            <StatTile
              label="This week"
              value={formatDuration(summary.weekSeconds)}
              sub="logged"
              icon={CalendarClock}
            />
            <StatTile
              label="Open work"
              value={`${summary.assignedOpenCount}`}
              sub="assigned to you"
              icon={ClipboardList}
            />
            <StatTile
              label="Active timer"
              value={timer ? formatClock(elapsed) : '—'}
              sub={timer ? timer.workItem.key : 'not running'}
              icon={Timer}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>This week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-end gap-2">
                  {summary.weekByDay.map((day) => (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t bg-primary/80"
                          style={{ height: `${(day.seconds / maxDay) * 100}%` }}
                          title={formatDuration(day.seconds)}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {DAY_LABELS[new Date(day.date).getUTCDay()]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(Object.entries(summary.assignedByStatus) as [WorkItemStatus, number][])
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span>{WORK_ITEM_STATUS_META[status].label}</span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                {summary.assignedOpenCount === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing assigned to you right now.</p>
                ) : null}
                <Link to="/work" className="mt-2 inline-block text-sm text-primary hover:underline">
                  Go to work →
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent time</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time logged yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {summary.recentLogs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        {log.workItem ? (
                          <Link
                            to={`/work/${log.workItem.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {log.workItem.key}
                          </Link>
                        ) : (
                          <span className="font-medium">—</span>
                        )}
                        <span className="ml-2 text-muted-foreground">{formatDate(log.spentOn)}</span>
                      </div>
                      <span className="tabular-nums">{formatDuration(log.seconds)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
