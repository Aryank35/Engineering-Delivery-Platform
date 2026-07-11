import { useState } from 'react';
import {
  PRIORITY_META,
  WORK_ITEM_STATUS_META,
  PERMISSIONS,
  type ActivityDto,
  type CommentDto,
  type Priority,
  type WorkItemStatus,
} from '@eop/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/permission-gate';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  useActivities,
  useAddComment,
  useComments,
  useDeleteComment,
  useUpdateComment,
} from './use-work-items';

function statusLabel(v: unknown): string {
  return typeof v === 'string' && v in WORK_ITEM_STATUS_META
    ? WORK_ITEM_STATUS_META[v as WorkItemStatus].label
    : String(v);
}
function priorityLabel(v: unknown): string {
  return typeof v === 'string' && v in PRIORITY_META
    ? PRIORITY_META[v as Priority].label
    : String(v);
}

function describeActivity(activity: ActivityDto): string {
  if (activity.type === 'CREATED') return 'created this item';
  const data = activity.data ?? {};
  const from = data.from;
  const to = data.to;
  switch (activity.field) {
    case 'status':
      return `changed status from ${statusLabel(from)} to ${statusLabel(to)}`;
    case 'priority':
      return `changed priority from ${priorityLabel(from)} to ${priorityLabel(to)}`;
    case 'title':
      return 'updated the title';
    case 'description':
      return 'updated the description';
    case 'storyPoints':
      return `changed estimate from ${from ?? '—'} to ${to ?? '—'}`;
    case 'assignee':
      if (!from) return `assigned ${to ?? 'someone'}`;
      if (!to) return `unassigned ${from}`;
      return `changed assignee from ${from} to ${to}`;
    case 'parent':
      if (!to) return `removed the parent`;
      return `set the parent to ${to}`;
    case 'startDate':
      return `changed start date to ${to ? formatDate(String(to)) : '—'}`;
    case 'dueDate':
      return `changed due date to ${to ? formatDate(String(to)) : '—'}`;
    case 'labels': {
      const added = (data.added as string[] | undefined) ?? [];
      const removed = (data.removed as string[] | undefined) ?? [];
      const parts: string[] = [];
      if (added.length) parts.push(`added ${added.join(', ')}`);
      if (removed.length) parts.push(`removed ${removed.join(', ')}`);
      return `${parts.join('; ') || 'updated'} label${added.length + removed.length > 1 ? 's' : ''}`;
    }
    default:
      return 'updated this item';
  }
}

type FeedEntry =
  | { kind: 'comment'; at: string; comment: CommentDto }
  | { kind: 'activity'; at: string; activity: ActivityDto };

export function WorkItemTimeline({ workItemId }: { workItemId: string }) {
  const { data: comments = [] } = useComments(workItemId);
  const { data: activities = [] } = useActivities(workItemId);

  const feed: FeedEntry[] = [
    ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, comment: c })),
    ...activities.map((a) => ({ kind: 'activity' as const, at: a.createdAt, activity: a })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Activity</h2>
      <ol className="space-y-4">
        {feed.map((entry) =>
          entry.kind === 'comment' ? (
            <CommentItem
              key={`c-${entry.comment.id}`}
              workItemId={workItemId}
              comment={entry.comment}
            />
          ) : (
            <ActivityItem key={`a-${entry.activity.id}`} activity={entry.activity} />
          ),
        )}
      </ol>
      <PermissionGate permission={PERMISSIONS.COMMENT_CREATE}>
        <CommentComposer workItemId={workItemId} />
      </PermissionGate>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityDto }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">
          {activity.actor ? activity.actor.fullName.slice(0, 2).toUpperCase() : '·'}
        </AvatarFallback>
      </Avatar>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{activity.actor?.fullName ?? 'System'}</span>{' '}
        {describeActivity(activity)}{' '}
        <span className="whitespace-nowrap text-xs">· {formatDateTime(activity.createdAt)}</span>
      </p>
    </li>
  );
}

function CommentItem({ workItemId, comment }: { workItemId: string; comment: CommentDto }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const canModerate = useAuthStore(
    (s) => s.user?.permissions.includes(PERMISSIONS.COMMENT_MODERATE) ?? false,
  );
  const canEdit = comment.author?.id === currentUserId || canModerate;

  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const updateComment = useUpdateComment(workItemId);
  const deleteComment = useDeleteComment(workItemId);

  return (
    <li className="flex items-start gap-3">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-[11px]">
          {comment.author ? comment.author.fullName.slice(0, 2).toUpperCase() : '·'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 rounded-md border bg-card p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium">{comment.author?.fullName ?? 'Unknown'}</span>{' '}
            <span className="text-xs text-muted-foreground">
              · {formatDateTime(comment.createdAt)}
              {comment.editedAt ? ' (edited)' : ''}
            </span>
          </div>
          {canEdit && !editing ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => {
                  if (window.confirm('Delete this comment?')) deleteComment.mutate(comment.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={updateComment.isPending || body.trim().length === 0}
                onClick={() =>
                  updateComment.mutate(
                    { commentId: comment.id, input: { body: body.trim() } },
                    { onSuccess: () => setEditing(false) },
                  )
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBody(comment.body);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
        )}
      </div>
    </li>
  );
}

function CommentComposer({ workItemId }: { workItemId: string }) {
  const [body, setBody] = useState('');
  const addComment = useAddComment(workItemId);
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Textarea
        placeholder="Leave a comment…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={addComment.isPending || body.trim().length === 0}
          onClick={() => addComment.mutate({ body: body.trim() }, { onSuccess: () => setBody('') })}
        >
          {addComment.isPending ? <Spinner /> : null}
          Comment
        </Button>
      </div>
    </div>
  );
}
