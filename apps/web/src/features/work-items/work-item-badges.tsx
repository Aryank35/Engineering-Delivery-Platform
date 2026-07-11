import {
  PRIORITY_META,
  WORK_ITEM_STATUS_META,
  WORK_ITEM_TYPE_META,
  type LabelDto,
  type Priority,
  type StatusCategory,
  type WorkItemStatus,
  type WorkItemType,
} from '@eop/shared';
import {
  AlertTriangle,
  BookMarked,
  CheckSquare,
  FileText,
  Layers,
  Minus,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_STYLE: Record<WorkItemType, { icon: LucideIcon; className: string }> = {
  REQUIREMENT: { icon: FileText, className: 'text-violet-500' },
  EPIC: { icon: Layers, className: 'text-fuchsia-500' },
  STORY: { icon: BookMarked, className: 'text-blue-500' },
  TASK: { icon: CheckSquare, className: 'text-emerald-500' },
};

export function TypeIcon({ type, className }: { type: WorkItemType; className?: string }) {
  const { icon: Icon, className: color } = TYPE_STYLE[type];
  return <Icon className={cn('h-4 w-4', color, className)} />;
}

export function TypeBadge({ type }: { type: WorkItemType }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <TypeIcon type={type} />
      {WORK_ITEM_TYPE_META[type].label}
    </span>
  );
}

const STATUS_DOT: Record<StatusCategory, string> = {
  backlog: 'bg-muted-foreground/50',
  todo: 'bg-slate-400',
  started: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-destructive',
};

export function StatusBadge({ status }: { status: WorkItemStatus }) {
  const meta = WORK_ITEM_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[meta.category])} />
      {meta.label}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, { icon: LucideIcon; className: string }> = {
  URGENT: { icon: AlertTriangle, className: 'text-destructive' },
  HIGH: { icon: SignalHigh, className: 'text-orange-500' },
  MEDIUM: { icon: SignalMedium, className: 'text-yellow-500' },
  LOW: { icon: SignalLow, className: 'text-blue-500' },
  NONE: { icon: Minus, className: 'text-muted-foreground' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { icon: Icon, className } = PRIORITY_STYLE[priority];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
      <Icon className={cn('h-3.5 w-3.5', className)} />
      {PRIORITY_META[priority].label}
    </span>
  );
}

export function LabelChip({ label }: { label: LabelDto }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  );
}
