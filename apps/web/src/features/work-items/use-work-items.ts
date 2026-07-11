import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateCommentInput,
  CreateWorkItemInput,
  ListWorkItemsQuery,
  UpdateCommentInput,
  UpdateWorkItemInput,
} from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { usersApi } from '@/features/users/users.api';
import { workItemsApi } from './work-items.api';

export function useWorkItems(query: Partial<ListWorkItemsQuery>) {
  return useQuery({
    queryKey: ['work-items', query],
    queryFn: () => workItemsApi.list(query),
    placeholderData: (prev) => prev,
  });
}

export function useWorkItem(id: string | undefined) {
  return useQuery({
    queryKey: ['work-item', id],
    queryFn: () => workItemsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateWorkItem(onDone?: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkItemInput) => workItemsApi.create(input),
    onSuccess: (item) => {
      void qc.invalidateQueries({ queryKey: ['work-items'] });
      if (item.parent) void qc.invalidateQueries({ queryKey: ['work-item', item.parent.id] });
      toast.success(`${item.key} created`);
      onDone?.(item.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateWorkItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkItemInput) => workItemsApi.update(id, input),
    onSuccess: (item) => {
      qc.setQueryData(['work-item', id], item);
      void qc.invalidateQueries({ queryKey: ['work-items'] });
      void qc.invalidateQueries({ queryKey: ['activities', id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteWorkItem(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workItemsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['work-items'] });
      toast.success('Work item deleted');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useComments(id: string) {
  return useQuery({ queryKey: ['comments', id], queryFn: () => workItemsApi.listComments(id) });
}

export function useActivities(id: string) {
  return useQuery({ queryKey: ['activities', id], queryFn: () => workItemsApi.listActivities(id) });
}

export function useAddComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => workItemsApi.addComment(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['work-item', id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateCommentInput }) =>
      workItemsApi.updateComment(commentId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', id] }),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => workItemsApi.deleteComment(commentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['work-item', id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

/** Active users for assignee pickers. */
export function useUserOptions() {
  return useQuery({
    queryKey: ['user-options'],
    queryFn: () =>
      usersApi.list({ pageSize: 100, isActive: true, sort: 'firstName', order: 'asc' }),
    staleTime: 60_000,
    select: (page) => page.data,
  });
}
