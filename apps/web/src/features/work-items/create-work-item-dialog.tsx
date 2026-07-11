import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  PRIORITIES,
  PRIORITY_META,
  WORK_ITEM_STATUSES,
  WORK_ITEM_STATUS_META,
  WORK_ITEM_TYPE_META,
  WORK_ITEM_TYPES,
  workItemKey,
  type CreateWorkItemInput,
  type Priority,
  type WorkItemStatus,
  type WorkItemType,
} from '@eop/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useLabels } from '@/features/labels/use-labels';
import { workItemsApi } from './work-items.api';
import { useCreateWorkItem, useUserOptions } from './use-work-items';

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  defaultType?: WorkItemType;
  defaultParentId?: string;
  trigger?: ReactNode;
  onCreated?: (id: string) => void;
}

export function CreateWorkItemDialog({ defaultType, defaultParentId, trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WorkItemType>(defaultType ?? 'TASK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('BACKLOG');
  const [priority, setPriority] = useState<Priority>('NONE');
  const [parentId, setParentId] = useState<string>(defaultParentId ?? '');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [labelIds, setLabelIds] = useState<string[]>([]);

  const parentType = WORK_ITEM_TYPE_META[type].allowedParents[0];
  const { data: labels = [] } = useLabels();
  const { data: users = [] } = useUserOptions();
  const parentsQuery = useQuery({
    queryKey: ['work-items', 'parents', parentType],
    queryFn: () => workItemsApi.list({ type: parentType, pageSize: 100 }),
    enabled: open && Boolean(parentType),
  });

  useEffect(() => {
    if (open) {
      setType(defaultType ?? 'TASK');
      setTitle('');
      setDescription('');
      setStatus('BACKLOG');
      setPriority('NONE');
      setParentId(defaultParentId ?? '');
      setAssigneeId('');
      setLabelIds([]);
    }
  }, [open, defaultType, defaultParentId]);

  const create = useCreateWorkItem((id) => {
    setOpen(false);
    onCreated?.(id);
  });

  const submit = () => {
    const input: CreateWorkItemInput = {
      type,
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      status,
      priority,
      parentId: parentId || null,
      assigneeId: assigneeId || null,
      labelIds,
    };
    create.mutate(input);
  };

  const toggleLabel = (id: string) =>
    setLabelIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            New item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create work item</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className={selectClass}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as WorkItemType);
                  setParentId('');
                }}
                disabled={Boolean(defaultType)}
              >
                {WORK_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORK_ITEM_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
              >
                {WORK_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {WORK_ITEM_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-title">Title</Label>
            <Input
              id="wi-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, descriptive summary"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-desc">Description</Label>
            <Textarea
              id="wi-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <select
                className={selectClass}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <select
                className={selectClass}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {parentType ? (
            <div className="space-y-2">
              <Label>Parent {WORK_ITEM_TYPE_META[parentType].label}</Label>
              <select
                className={selectClass}
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={Boolean(defaultParentId)}
              >
                <option value="">None</option>
                {(parentsQuery.data?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {workItemKey(item.number)} · {item.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {labels.length > 0 ? (
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const active = labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || title.trim().length === 0}>
              {create.isPending ? <Spinner /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
