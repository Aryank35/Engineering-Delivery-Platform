import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateSprintInput,
  ListSprintsQuery,
  MoveWorkItemInput,
  SprintItemsInput,
  UpdateSprintInput,
} from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { workItemsApi } from '@/features/work-items/work-items.api';
import { sprintsApi } from './sprints.api';

export function useSprints(query: Partial<ListSprintsQuery>) {
  return useQuery({
    queryKey: ['sprints', query],
    queryFn: () => sprintsApi.list(query),
    placeholderData: (prev) => prev,
  });
}

export function useSprint(id: string | undefined) {
  return useQuery({
    queryKey: ['sprint', id],
    queryFn: () => sprintsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useBoard(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['board', sprintId],
    queryFn: () => sprintsApi.board(sprintId as string),
    enabled: Boolean(sprintId),
  });
}

export function useSprintAnalytics(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['sprint-analytics', sprintId],
    queryFn: () => sprintsApi.analytics(sprintId as string),
    enabled: Boolean(sprintId),
  });
}

export function useCreateSprint(onDone?: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSprintInput) => sprintsApi.create(input),
    onSuccess: (sprint) => {
      void qc.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint created');
      onDone?.(sprint.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateSprint(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSprintInput) => sprintsApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints'] });
      void qc.invalidateQueries({ queryKey: ['sprint', id] });
      void qc.invalidateQueries({ queryKey: ['board', id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSprintLifecycle(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['sprints'] });
    void qc.invalidateQueries({ queryKey: ['sprint', id] });
    void qc.invalidateQueries({ queryKey: ['board', id] });
  };
  const start = useMutation({
    mutationFn: () => sprintsApi.start(id),
    onSuccess: () => {
      invalidate();
      toast.success('Sprint started');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const complete = useMutation({
    mutationFn: () => sprintsApi.complete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Sprint completed');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return { start, complete };
}

export function useSprintItems(id: string, onDone?: () => void) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['board', id] });
    void qc.invalidateQueries({ queryKey: ['sprint-analytics', id] });
    void qc.invalidateQueries({ queryKey: ['work-items'] });
  };
  const add = useMutation({
    mutationFn: (input: SprintItemsInput) => sprintsApi.addItems(id, input),
    onSuccess: () => {
      invalidate();
      toast.success('Items added to sprint');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (input: SprintItemsInput) => sprintsApi.removeItems(id, input),
    onSuccess: () => {
      invalidate();
      toast.success('Item removed from sprint');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return { add, remove };
}

export function useMoveWorkItem(sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveWorkItemInput }) =>
      workItemsApi.move(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprint-analytics', sprintId] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      void qc.invalidateQueries({ queryKey: ['board', sprintId] });
    },
  });
}

/** Join a sprint room and refetch the board when the server signals a change. */
export function useSprintRealtime(sprintId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!sprintId) return;
    const socket = getSocket();
    const join = () => socket.emit('sprint:join', { sprintId });
    if (socket.connected) join();
    socket.on('connect', join);
    const onChanged = (payload: { sprintId: string }) => {
      if (payload.sprintId === sprintId) {
        void qc.invalidateQueries({ queryKey: ['board', sprintId] });
        void qc.invalidateQueries({ queryKey: ['sprint-analytics', sprintId] });
      }
    };
    socket.on('board:changed', onChanged);
    return () => {
      socket.emit('sprint:leave', { sprintId });
      socket.off('connect', join);
      socket.off('board:changed', onChanged);
    };
  }, [sprintId, qc]);
}

/** Refetch the sprint list when sprints are created/updated elsewhere. */
export function useSprintsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('sprints:join');
    if (socket.connected) join();
    socket.on('connect', join);
    const onChanged = () => void qc.invalidateQueries({ queryKey: ['sprints'] });
    socket.on('sprints:changed', onChanged);
    return () => {
      socket.off('connect', join);
      socket.off('sprints:changed', onChanged);
    };
  }, [qc]);
}
