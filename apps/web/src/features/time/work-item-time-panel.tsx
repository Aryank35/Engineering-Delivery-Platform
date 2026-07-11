import { useState } from 'react';
import { Pause, Play, Plus, Square, Timer, Trash2 } from 'lucide-react';
import { formatClock, formatDuration, PERMISSIONS, type TimeLogDto } from '@eop/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  useActiveTimer,
  useCreateTimeLog,
  useDeleteTimeLog,
  useLiveElapsed,
  useTimerControls,
  useWorkItemTimeLogs,
  useWorkItemTimeTotal,
} from './use-time';

export function WorkItemTimePanel({ workItemId }: { workItemId: string }) {
  const canLog = useAuthStore((s) => s.hasPermission(PERMISSIONS.TIME_LOG));
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: activeTimer } = useActiveTimer();
  const { start, pause, resume, stop } = useTimerControls();
  const { data: total } = useWorkItemTimeTotal(workItemId);
  const { data: logsPage } = useWorkItemTimeLogs(workItemId);
  const deleteLog = useDeleteTimeLog();

  const timerForItem = activeTimer && activeTimer.workItem.id === workItemId ? activeTimer : null;
  const elapsed = useLiveElapsed(timerForItem);

  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const createLog = useCreateTimeLog(() => {
    setMinutes('');
    setNote('');
  });

  const logs = logsPage?.data ?? [];
  const pending = start.isPending || pause.isPending || resume.isPending || stop.isPending;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="h-4 w-4 text-muted-foreground" /> Time
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDuration(total?.seconds ?? 0)} logged
          </span>
        </div>

        {canLog ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
            {timerForItem ? (
              <>
                <span className="font-mono text-lg tabular-nums">{formatClock(elapsed)}</span>
                <Badge variant={timerForItem.status === 'RUNNING' ? 'success' : 'muted'}>
                  {timerForItem.status === 'RUNNING' ? 'Running' : 'Paused'}
                </Badge>
                <div className="ml-auto flex gap-2">
                  {timerForItem.status === 'RUNNING' ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => pause.mutate()}>
                      <Pause className="h-4 w-4" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => resume.mutate()}>
                      <Play className="h-4 w-4" /> Resume
                    </Button>
                  )}
                  <Button size="sm" disabled={pending} onClick={() => stop.mutate()}>
                    <Square className="h-4 w-4" /> Stop
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {activeTimer ? `A timer is running on ${activeTimer.workItem.key}` : 'No timer running'}
                </span>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={pending}
                  onClick={() => start.mutate({ workItemId })}
                >
                  {pending ? <Spinner /> : <Play className="h-4 w-4" />} Start timer
                </Button>
              </>
            )}
          </div>
        ) : null}

        {canLog ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const mins = Number.parseInt(minutes, 10);
              if (Number.isFinite(mins) && mins > 0) {
                createLog.mutate({ workItemId, minutes: mins, description: note.trim() || null });
              }
            }}
          >
            <div className="w-24">
              <Input
                type="number"
                min={1}
                placeholder="mins"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <Input
              className="flex-1"
              placeholder="What did you work on? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={createLog.isPending || !minutes}>
              <Plus className="h-4 w-4" /> Log
            </Button>
          </form>
        ) : null}

        {logs.length > 0 ? (
          <ul className="divide-y text-sm">
            {logs.map((log: TimeLogDto) => (
              <li key={log.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <span className="font-medium">{formatDuration(log.seconds)}</span>{' '}
                  <span className="text-muted-foreground">
                    · {log.user?.fullName ?? 'Unknown'} · {formatDate(log.spentOn)}
                  </span>
                  {log.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {log.description}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={log.source === 'TIMER' ? 'default' : 'secondary'}>
                    {log.source === 'TIMER' ? 'Timer' : 'Manual'}
                  </Badge>
                  {log.user?.id === currentUserId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteLog.mutate(log.id)}
                      aria-label="Delete log"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
