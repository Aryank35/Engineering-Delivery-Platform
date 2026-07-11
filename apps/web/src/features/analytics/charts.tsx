import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  BurndownPoint,
  DefectWeekPoint,
  ThroughputPoint,
  VelocityPoint,
} from '@eop/shared';

export function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 } as const;
const gridStroke = 'var(--chart-grid)';
const tooltipContentStyle = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 8,
  fontSize: 12,
};
const tooltipItemStyle = { color: 'hsl(var(--foreground))' };
const tooltipLabelStyle = { color: 'hsl(var(--muted-foreground))' };
const legendStyle = { fontSize: 12, color: 'hsl(var(--foreground))' };

const commonTooltip = (
  <Tooltip
    contentStyle={tooltipContentStyle}
    itemStyle={tooltipItemStyle}
    labelStyle={tooltipLabelStyle}
    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
  />
);

export function VelocityChart({ data }: { data: VelocityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        {commonTooltip}
        <Legend wrapperStyle={legendStyle} />
        <Bar name="Committed" dataKey="committedPoints" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar name="Completed" dataKey="completedPoints" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="weekStart"
          tickFormatter={weekLabel}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
        />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(v) => `Week of ${weekLabel(String(v))}`}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
        />
        <Bar name="Completed" dataKey="completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BurndownChart({ data }: { data: BurndownPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={weekLabel}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
        />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(v) => weekLabel(String(v))}
          cursor={{ stroke: gridStroke }}
        />
        <Legend wrapperStyle={legendStyle} />
        <Line
          name="Ideal"
          dataKey="ideal"
          stroke="var(--chart-ideal)"
          strokeDasharray="4 4"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          name="Remaining"
          dataKey="remaining"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DefectsChart({ data }: { data: DefectWeekPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="weekStart"
          tickFormatter={weekLabel}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: gridStroke }}
        />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          labelFormatter={(v) => `Week of ${weekLabel(String(v))}`}
          cursor={{ stroke: gridStroke }}
        />
        <Legend wrapperStyle={legendStyle} />
        <Line
          name="Opened"
          dataKey="created"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
        <Line
          name="Resolved"
          dataKey="resolved"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Simple horizontal magnitude bars (single hue) for category comparisons. */
export function MagnitudeBars({
  rows,
}: {
  rows: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">{row.hint ?? row.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: 'var(--chart-1)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
