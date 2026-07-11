import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowLeft } from 'lucide-react';
import {
  BOARD_COLUMN_STATUSES,
  SPRINT_STATUS_META,
  WORK_ITEM_STATUSES,
  PERMISSIONS,
  type WorkItemSummary,
} from '@eop/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/permission-gate';
import { BurndownChart } from '@/features/analytics/charts';
import { useBurndown } from '@/features/analytics/use-analytics';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { BoardCardView } from './board-card';
import { BoardColumn } from './board-column';
import { columnOf, computeDrop, type BoardColumns } from './board-utils';
import { PlanSprintDialog } from '../plan-sprint-dialog';
import { SprintAnalyticsPanel } from '../sprint-analytics-panel';
import { useBoard, useMoveWorkItem, useSprintLifecycle, useSprintRealtime } from '../use-sprints';

const emptyColumns = (): BoardColumns => {
  const cols = {} as BoardColumns;
  for (const s of WORK_ITEM_STATUSES) cols[s] = [];
  return cols;
};

function SprintBurndownCard({ sprintId }: { sprintId: string }) {
  const { data, isLoading } = useBurndown(sprintId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Burndown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="h-[260px]" />
        ) : data.totalPoints === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Add story points to see the burndown.
          </p>
        ) : (
          <BurndownChart data={data.points} />
        )}
      </CardContent>
    </Card>
  );
}

export function SprintBoardPage() {
  const { id } = useParams<{ id: string }>();
  const sprintId = id ?? '';
  const { data: board, isLoading, isError } = useBoard(sprintId);
  const move = useMoveWorkItem(sprintId);
  const { start, complete } = useSprintLifecycle(sprintId);
  useSprintRealtime(sprintId);

  const canMove = useAuthStore((s) => s.hasPermission(PERMISSIONS.WORKITEM_UPDATE));

  const [columns, setColumns] = useState<BoardColumns>(emptyColumns);
  const [wip, setWip] = useState<Record<string, number | null>>({});
  const [activeItem, setActiveItem] = useState<WorkItemSummary | null>(null);

  useEffect(() => {
    if (!board) return;
    const next = emptyColumns();
    const limits: Record<string, number | null> = {};
    for (const column of board.columns) {
      next[column.status] = column.items;
      limits[column.status] = column.wipLimit;
    }
    setColumns(next);
    setWip(limits);
  }, [board]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (event: DragStartEvent) => {
    const from = columnOf(columns, String(event.active.id));
    if (from) setActiveItem(columns[from].find((i) => i.id === event.active.id) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const result = computeDrop(columns, String(active.id), String(over.id));
    if (!result) return;

    setColumns(result.columns);
    move.mutate({
      id: result.movedId,
      input: {
        status: result.toStatus,
        sprintId,
        beforeId: result.beforeId,
        afterId: result.afterId,
      },
    });
  };

  if (isLoading) return <FullPageSpinner label="Loading board…" />;
  if (isError || !board) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Sprint not found.{' '}
        <Link to="/sprints" className="text-primary hover:underline">
          Back to sprints
        </Link>
      </div>
    );
  }

  const { sprint } = board;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/sprints" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Sprints
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{sprint.name}</h1>
            <Badge
              variant={
                sprint.status === 'ACTIVE'
                  ? 'success'
                  : sprint.status === 'COMPLETED'
                    ? 'muted'
                    : 'secondary'
              }
            >
              {SPRINT_STATUS_META[sprint.status].label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
            {sprint.goal ? ` · ${sprint.goal}` : ''}
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.SPRINT_MANAGE}>
          <div className="flex items-center gap-2">
            <PlanSprintDialog sprintId={sprintId} />
            {sprint.status === 'PLANNED' ? (
              <Button size="sm" disabled={start.isPending} onClick={() => start.mutate()}>
                Start sprint
              </Button>
            ) : null}
            {sprint.status === 'ACTIVE' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={complete.isPending}
                onClick={() => complete.mutate()}
              >
                Complete sprint
              </Button>
            ) : null}
          </div>
        </PermissionGate>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SprintAnalyticsPanel sprintId={sprintId} />
        </div>
        <SprintBurndownCard sprintId={sprintId} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMN_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              items={columns[status]}
              wipLimit={wip[status] ?? null}
              disabled={!canMove}
            />
          ))}
        </div>
        <DragOverlay>{activeItem ? <BoardCardView item={activeItem} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
