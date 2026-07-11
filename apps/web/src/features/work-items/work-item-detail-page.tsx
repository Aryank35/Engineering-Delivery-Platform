import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Plus, Tag, Trash2 } from 'lucide-react';
import {
  childTypeOf,
  PRIORITIES,
  PRIORITY_META,
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_META,
  WORK_ITEM_TYPE_META,
  PERMISSIONS,
  type Priority,
  type UpdateWorkItemInput,
  type WorkItemStatus,
} from '@eop/shared';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FullPageSpinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLabels } from '@/features/labels/use-labels';
import { workItemsApi } from './work-items.api';
import { WorkItemTimePanel } from '@/features/time/work-item-time-panel';
import { CreateWorkItemDialog } from './create-work-item-dialog';
import { LabelChip, PriorityBadge, StatusBadge, TypeBadge, TypeIcon } from './work-item-badges';
import { WorkItemTimeline } from './work-item-timeline';
import {
  useDeleteWorkItem,
  useUpdateWorkItem,
  useUserOptions,
  useWorkItem,
} from './use-work-items';

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70';

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const fromDateInput = (value: string) =>
  value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function WorkItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, isError } = useWorkItem(id);
  const update = useUpdateWorkItem(id ?? '');
  const deleteItem = useDeleteWorkItem(() => navigate('/work'));

  const canUpdate = useAuthStore((s) => s.hasPermission(PERMISSIONS.WORKITEM_UPDATE));
  const canDelete = useAuthStore((s) => s.hasPermission(PERMISSIONS.WORKITEM_DELETE));

  const { data: users = [] } = useUserOptions();
  const { data: labels = [] } = useLabels();

  const [description, setDescription] = useState('');
  useEffect(() => {
    setDescription(item?.description ?? '');
  }, [item?.id, item?.description]);

  const parentType = item ? WORK_ITEM_TYPE_META[item.type].allowedParents[0] : undefined;
  const parentsQuery = useQuery({
    queryKey: ['work-items', 'parents', parentType],
    queryFn: () => workItemsApi.list({ type: parentType, pageSize: 100 }),
    enabled: Boolean(parentType) && canUpdate,
  });

  if (isLoading) return <FullPageSpinner label="Loading work item…" />;
  if (isError || !item) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Work item not found.{' '}
        <Link to="/work" className="text-primary hover:underline">
          Back to work
        </Link>
      </div>
    );
  }

  const patch = (input: UpdateWorkItemInput) => update.mutate(input);
  const activeLabelIds = item.labels.map((l) => l.id);
  const childType = childTypeOf(item.type);

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/work" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Work
        </Link>
        <span>/</span>
        <span className="font-mono">{item.key}</span>
      </div>

      <div className="flex items-center justify-between">
        <TypeBadge type={item.type} />
        {canDelete ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(`Delete ${item.key}? This cannot be undone.`)) {
                deleteItem.mutate(item.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {canUpdate ? (
            <Input
              key={item.id}
              defaultValue={item.title}
              className="h-11 text-lg font-semibold"
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== item.title) patch({ title: value });
              }}
            />
          ) : (
            <h1 className="text-2xl font-semibold">{item.title}</h1>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </p>
            {canUpdate ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Add a description…"
                />
                {description !== (item.description ?? '') ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => patch({ description: description.trim() || null })}
                    >
                      Save description
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDescription(item.description ?? '')}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {item.description || 'No description.'}
              </p>
            )}
          </div>

          <WorkItemTimePanel workItemId={item.id} />

          {childType ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Child {WORK_ITEM_TYPE_META[childType].label.toLowerCase()}s (
                    {item.children.length})
                  </p>
                  <PermissionGate permission={PERMISSIONS.WORKITEM_CREATE}>
                    <CreateWorkItemDialog
                      defaultType={childType}
                      defaultParentId={item.id}
                      onCreated={(childId) => navigate(`/work/${childId}`)}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      }
                    />
                  </PermissionGate>
                </div>
                {item.children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No children yet.</p>
                ) : (
                  <ul className="divide-y">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/work/${child.id}`}
                          className="flex items-center gap-2 py-2 text-sm hover:text-primary"
                        >
                          <TypeIcon type={child.type} />
                          <span className="font-mono text-xs text-muted-foreground">
                            {child.key}
                          </span>
                          <span className="flex-1 truncate">{child.title}</span>
                          <StatusBadge status={child.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          <WorkItemTimeline workItemId={item.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Field label="Status">
                <select
                  className={selectClass}
                  disabled={!canUpdate}
                  value={item.status}
                  onChange={(e) => patch({ status: e.target.value as WorkItemStatus })}
                >
                  {WORK_ITEM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {WORK_ITEM_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority">
                <select
                  className={selectClass}
                  disabled={!canUpdate}
                  value={item.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assignee">
                <select
                  className={selectClass}
                  disabled={!canUpdate}
                  value={item.assignee?.id ?? ''}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </Field>

              {parentType ? (
                <Field label={`Parent ${WORK_ITEM_TYPE_META[parentType].label}`}>
                  <select
                    className={selectClass}
                    disabled={!canUpdate}
                    value={item.parent?.id ?? ''}
                    onChange={(e) => patch({ parentId: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {(parentsQuery.data?.data ?? [])
                      .filter((p) => p.id !== item.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.key} · {p.title}
                        </option>
                      ))}
                  </select>
                </Field>
              ) : null}

              <Field label="Estimate (points)">
                <Input
                  type="number"
                  min={0}
                  disabled={!canUpdate}
                  defaultValue={item.storyPoints ?? ''}
                  key={`sp-${item.id}-${item.storyPoints}`}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const next = raw === '' ? null : Number.parseInt(raw, 10);
                    if (next !== item.storyPoints) patch({ storyPoints: next });
                  }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <Input
                    type="date"
                    disabled={!canUpdate}
                    value={toDateInput(item.startDate)}
                    onChange={(e) => patch({ startDate: fromDateInput(e.target.value) })}
                  />
                </Field>
                <Field label="Due">
                  <Input
                    type="date"
                    disabled={!canUpdate}
                    value={toDateInput(item.dueDate)}
                    onChange={(e) => patch({ dueDate: fromDateInput(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="Labels">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.labels.map((l) => (
                    <LabelChip key={l.id} label={l} />
                  ))}
                  {canUpdate ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs">
                          <Tag className="h-3 w-3" /> Edit
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {labels.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No labels defined
                          </div>
                        ) : (
                          labels.map((label) => {
                            const active = activeLabelIds.includes(label.id);
                            return (
                              <DropdownMenuItem
                                key={label.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  const next = active
                                    ? activeLabelIds.filter((x) => x !== label.id)
                                    : [...activeLabelIds, label.id];
                                  patch({ labelIds: next });
                                }}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className="flex-1">{label.name}</span>
                                {active ? <Check className="h-3.5 w-3.5" /> : null}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reporter</span>
                <span>{item.reporter?.fullName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={item.priority} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDateTime(item.updatedAt)}</span>
              </div>
              {item.completedAt ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{formatDateTime(item.completedAt)}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
