import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PRIORITIES,
  PRIORITY_META,
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_META,
  WORK_ITEM_TYPES,
  WORK_ITEM_TYPE_META,
  PERMISSIONS,
  type ListWorkItemsQuery,
  type Priority,
  type WorkItemStatus,
  type WorkItemType,
} from '@eop/shared';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateWorkItemDialog } from './create-work-item-dialog';
import { LabelChip, PriorityBadge, StatusBadge, TypeIcon } from './work-item-badges';
import { useWorkItems } from './use-work-items';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function WorkItemsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<WorkItemType | ''>('');
  const [status, setStatus] = useState<WorkItemStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');

  const query: Partial<ListWorkItemsQuery> = {
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
  };

  const { data, isLoading, isError } = useWorkItems(query);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const resetPage = () => setPage(1);

  return (
    <>
      <PageHeader
        title="Work"
        description="Requirements, epics, stories and tasks across the delivery lifecycle."
        actions={
          <PermissionGate permission={PERMISSIONS.WORKITEM_CREATE}>
            <CreateWorkItemDialog onCreated={(id) => navigate(`/work/${id}`)} />
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              placeholder="Search title or description…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="lg:max-w-xs"
            />
            <select
              className={selectClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as WorkItemType | '');
                resetPage();
              }}
            >
              <option value="">All types</option>
              {WORK_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORK_ITEM_TYPE_META[t].label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as WorkItemStatus | '');
                resetPage();
              }}
            >
              <option value="">All statuses</option>
              {WORK_ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {WORK_ITEM_STATUS_META[s].label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as Priority | '');
                resetPage();
              }}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-destructive">
                    Failed to load work items.
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No work items match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/work/${item.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.key}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon type={item.type} />
                        <span className="font-medium">{item.title}</span>
                        {item.labels.slice(0, 2).map((l) => (
                          <LabelChip key={l.id} label={l} />
                        ))}
                        {item.labels.length > 2 ? (
                          <span className="text-xs text-muted-foreground">
                            +{item.labels.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={item.priority} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.assignee?.fullName ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta ? (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <span>
                {meta.total} item{meta.total === 1 ? '' : 's'} · page {meta.page} of{' '}
                {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
