import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { WorkItemSummary } from '@eop/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LabelChip, PriorityBadge, TypeIcon } from '@/features/work-items/work-item-badges';

/** Presentational card, reused by the sortable card and the drag overlay. */
export function BoardCardView({
  item,
  dragging,
}: {
  item: WorkItemSummary;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm',
        dragging && 'shadow-lg ring-2 ring-primary/40',
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <TypeIcon type={item.type} />
        <Link
          to={`/work/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-mono text-xs text-muted-foreground hover:text-primary"
        >
          {item.key}
        </Link>
      </div>
      <p className="mb-2 line-clamp-3 text-sm font-medium">{item.title}</p>
      {item.labels.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={item.priority} />
        {item.assignee ? (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {item.assignee.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  );
}

export function BoardCard({ item, disabled }: { item: WorkItemSummary; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={disabled ? '' : 'cursor-grab active:cursor-grabbing'}
    >
      <BoardCardView item={item} />
    </div>
  );
}
