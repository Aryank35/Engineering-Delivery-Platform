import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WORK_ITEM_STATUS_META, type WorkItemStatus, type WorkItemSummary } from '@eop/shared';
import { cn } from '@/lib/utils';
import { BoardCard } from './board-card';

interface Props {
  status: WorkItemStatus;
  items: WorkItemSummary[];
  wipLimit: number | null;
  disabled: boolean;
}

export function BoardColumn({ status, items, wipLimit, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const overLimit = wipLimit != null && items.length > wipLimit;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {WORK_ITEM_STATUS_META[status].label}
          <span className={cn('text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
            {items.length}
            {wipLimit != null ? `/${wipLimit}` : ''}
          </span>
        </div>
        {overLimit ? <span className="text-xs font-medium text-destructive">Over WIP</span> : null}
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-[140px] flex-1 flex-col gap-2 p-2',
            isOver && 'rounded-lg ring-2 ring-primary/40',
          )}
        >
          {items.map((item) => (
            <BoardCard key={item.id} item={item} disabled={disabled} />
          ))}
          {items.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">No items</p>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
