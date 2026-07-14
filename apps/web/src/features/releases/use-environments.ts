import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateEnvironmentInput, UpdateEnvironmentInput } from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { environmentsApi } from './releases.api';

function invalidateEnvironments(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['environments'] });
}

export function useEnvironments() {
  return useQuery({ queryKey: ['environments'], queryFn: () => environmentsApi.list() });
}

export function useEnvironmentStatus() {
  return useQuery({
    queryKey: ['environments', 'status'],
    queryFn: () => environmentsApi.status(),
  });
}

export function useCreateEnvironment(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEnvironmentInput) => environmentsApi.create(input),
    onSuccess: () => {
      invalidateEnvironments(qc);
      toast.success('Environment created');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateEnvironment(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEnvironmentInput }) =>
      environmentsApi.update(id, input),
    onSuccess: () => {
      invalidateEnvironments(qc);
      toast.success('Environment updated');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => environmentsApi.remove(id),
    onSuccess: () => {
      invalidateEnvironments(qc);
      toast.success('Environment deleted');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
