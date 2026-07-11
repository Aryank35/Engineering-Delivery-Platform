import {
  BOARD_COLUMN_STATUSES,
  WORK_ITEM_STATUSES,
  type WorkItemStatus,
  type WorkItemSummary,
} from '@eop/shared';

export type BoardColumns = Record<WorkItemStatus, WorkItemSummary[]>;

export function columnOf(columns: BoardColumns, itemId: string): WorkItemStatus | null {
  return BOARD_COLUMN_STATUSES.find((s) => columns[s]?.some((i) => i.id === itemId)) ?? null;
}

export interface DropResult {
  columns: BoardColumns;
  toStatus: WorkItemStatus;
  movedId: string;
  beforeId?: string;
  afterId?: string;
}

/**
 * Pure drag-and-drop resolver: given the current columns and a drop (active over
 * a card id or a `col:<status>` droppable), returns the next columns plus the
 * moved card's new column and neighbours (for server-side rank computation).
 * Returns null for no-ops.
 */
export function computeDrop(
  columns: BoardColumns,
  activeId: string,
  overId: string,
): DropResult | null {
  if (activeId === overId) return null;

  const from = columnOf(columns, activeId);
  if (!from) return null;

  const toStatus = overId.startsWith('col:')
    ? (overId.slice(4) as WorkItemStatus)
    : (columnOf(columns, overId) ?? from);
  if (!BOARD_COLUMN_STATUSES.includes(toStatus)) return null;

  const fromIndex = columns[from].findIndex((i) => i.id === activeId);
  if (fromIndex < 0) return null;

  const next = {} as BoardColumns;
  for (const s of WORK_ITEM_STATUSES) next[s] = [...(columns[s] ?? [])];

  const [moved] = next[from].splice(fromIndex, 1);
  if (!moved) return null;

  const dest = next[toStatus];
  const insertAt = overId.startsWith('col:')
    ? dest.length
    : Math.max(0, dest.findIndex((i) => i.id === overId));

  if (from === toStatus && fromIndex === insertAt) return null;

  dest.splice(insertAt, 0, { ...moved, status: toStatus });

  const pos = dest.findIndex((i) => i.id === activeId);
  return {
    columns: next,
    toStatus,
    movedId: activeId,
    beforeId: pos > 0 ? dest[pos - 1].id : undefined,
    afterId: pos < dest.length - 1 ? dest[pos + 1].id : undefined,
  };
}
