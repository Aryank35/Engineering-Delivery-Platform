import { Link } from 'react-router-dom';
import { Square } from 'lucide-react';
import { formatClock } from '@eop/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActiveTimer, useLiveElapsed, useTimerControls } from './use-time';

export function ActiveTimerWidget() {
  const { data: timer } = useActiveTimer();
  const { stop } = useTimerControls();
  const elapsed = useLiveElapsed(timer ?? null);

  if (!timer) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-sm">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          timer.status === 'RUNNING' ? 'animate-pulse bg-success' : 'bg-muted-foreground',
        )}
      />
      <Link
        to={`/work/${timer.workItem.id}`}
        className="font-mono text-xs text-muted-foreground hover:text-foreground"
        title={timer.workItem.title}
      >
        {timer.workItem.key}
      </Link>
      <span className="font-mono tabular-nums">{formatClock(elapsed)}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        aria-label="Stop timer"
        disabled={stop.isPending}
        onClick={() => stop.mutate()}
      >
        <Square className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
