import { useState } from 'react';
import { formatDuration, WORK_ITEM_STATUS_META } from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DefectsChart, MagnitudeBars, ThroughputChart, VelocityChart } from './charts';
import { useOverview, useQaAnalytics, useVelocity } from './use-analytics';

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data: overview, isLoading } = useOverview();
  const { data: velocity } = useVelocity();

  if (isLoading || !overview) {
    return <Skeleton className="h-64 w-full" />;
  }

  const lastSprint = velocity && velocity.length > 0 ? velocity[velocity.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open work" value={`${overview.totalOpen}`} sub="items in progress" />
        <StatTile
          label="Completed this week"
          value={`${overview.completedThisWeek}`}
          sub="items done"
        />
        <StatTile
          label="Avg cycle time"
          value={`${overview.cycleTime.avgDays}d`}
          sub={`${overview.cycleTime.sampleSize} items · median ${overview.cycleTime.medianDays}d`}
        />
        <StatTile
          label="Last velocity"
          value={lastSprint ? `${lastSprint.completedPoints} pts` : '—'}
          sub={lastSprint ? lastSprint.name : 'no sprints'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Throughput (items completed / week)">
          <ThroughputChart data={overview.throughput} />
        </ChartCard>
        <ChartCard title="Velocity (story points / sprint)">
          {velocity && velocity.length > 0 ? (
            <VelocityChart data={velocity} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No sprint data yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Status distribution">
          <MagnitudeBars
            rows={overview.statusDistribution
              .filter((s) => s.count > 0)
              .map((s) => ({ label: WORK_ITEM_STATUS_META[s.status].label, value: s.count }))}
          />
        </ChartCard>
        <ChartCard title="Workload (open items)">
          {overview.workload.length > 0 ? (
            <MagnitudeBars
              rows={overview.workload.map((w) => ({
                label: w.assignee?.fullName ?? 'Unassigned',
                value: w.open,
                hint: `${w.open} open · ${w.points} pts`,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No open work.</p>
          )}
        </ChartCard>
        <ChartCard title="Time logged this week">
          {overview.timeByUser.length > 0 ? (
            <MagnitudeBars
              rows={overview.timeByUser.map((t) => ({
                label: t.user?.fullName ?? 'Unknown',
                value: t.seconds,
                hint: formatDuration(t.seconds),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No time logged yet.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function QaTab() {
  const { data: qa, isLoading } = useQaAnalytics();
  if (isLoading || !qa) {
    return <Skeleton className="h-64 w-full" />;
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In QA" value={`${qa.inQaCount}`} />
        <StatTile label="In review" value={`${qa.inReviewCount}`} />
        <StatTile label="Open defects" value={`${qa.defectsOpen}`} sub="bug-labelled, not done" />
        <StatTile label="Resolved defects" value={`${qa.defectsResolved}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Defects opened vs resolved / week">
          <DefectsChart data={qa.defectsByWeek} />
        </ChartCard>
        <ChartCard title="Defects by status">
          {qa.defectsByStatus.length > 0 ? (
            <MagnitudeBars
              rows={qa.defectsByStatus.map((s) => ({
                label: WORK_ITEM_STATUS_META[s.status].label,
                value: s.count,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No defects tracked yet.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export function InsightsPage() {
  const [tab, setTab] = useState<'overview' | 'qa'>('overview');
  return (
    <>
      <PageHeader title="Insights" description="Delivery analytics across the team." />
      <div className="flex gap-1 rounded-md border bg-muted/40 p-1 text-sm">
        {(['overview', 'qa'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded px-3 py-1.5 font-medium capitalize transition-colors',
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'qa' ? 'QA & Defects' : 'Overview'}
          </button>
        ))}
      </div>
      {tab === 'overview' ? <OverviewTab /> : <QaTab />}
    </>
  );
}
