import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateLabelInput, UpdateLabelInput } from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { labelsApi } from './labels.api';

export function useLabels() {
  return useQuery({ queryKey: ['labels'], queryFn: () => labelsApi.list(), staleTime: 60_000 });
}

export function useCreateLabel(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabelInput) => labelsApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label created');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateLabel(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLabelInput }) =>
      labelsApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label updated');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labelsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['labels'] });
      void qc.invalidateQueries({ queryKey: ['work-items'] });
      toast.success('Label deleted');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
