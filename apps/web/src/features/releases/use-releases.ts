import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateDeploymentInput,
  CreateReleaseInput,
  ListReleasesQuery,
  ReleaseItemsInput,
  ReleaseStatus,
  UpdateDeploymentInput,
  UpdateReleaseInput,
} from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { releasesApi } from './releases.api';

function invalidateReleases(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: ['releases'] });
  void qc.invalidateQueries({ queryKey: ['environments', 'status'] });
  if (id) void qc.invalidateQueries({ queryKey: ['release', id] });
}

export function useReleases(query: Partial<ListReleasesQuery>) {
  return useQuery({
    queryKey: ['releases', query],
    queryFn: () => releasesApi.list(query),
    placeholderData: (prev) => prev,
  });
}

export function useRelease(id: string | undefined) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: () => releasesApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateRelease(onDone?: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReleaseInput) => releasesApi.create(input),
    onSuccess: (release) => {
      invalidateReleases(qc);
      toast.success('Release created');
      onDone?.(release.id);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateRelease(id: string, onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateReleaseInput) => releasesApi.update(id, input),
    onSuccess: () => {
      invalidateReleases(qc, id);
      toast.success('Release updated');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useSetReleaseStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: ReleaseStatus) => releasesApi.setStatus(id, status),
    onSuccess: () => {
      invalidateReleases(qc, id);
      toast.success('Release status updated');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteRelease(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releasesApi.remove(id),
    onSuccess: () => {
      invalidateReleases(qc);
      toast.success('Release deleted');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useReleaseItems(id: string, onDone?: () => void) {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (input: ReleaseItemsInput) => releasesApi.addItems(id, input),
    onSuccess: () => {
      invalidateReleases(qc, id);
      toast.success('Items added to release');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (input: ReleaseItemsInput) => releasesApi.removeItems(id, input),
    onSuccess: () => invalidateReleases(qc, id),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return { add, remove };
}

export function useDeployRelease(id: string, onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeploymentInput) => releasesApi.deploy(id, input),
    onSuccess: () => {
      invalidateReleases(qc, id);
      toast.success('Deployment recorded');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateDeployment(releaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deploymentId, input }: { deploymentId: string; input: UpdateDeploymentInput }) =>
      releasesApi.updateDeployment(releaseId, deploymentId, input),
    onSuccess: () => invalidateReleases(qc, releaseId),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

/** Join the releases room and refetch when releases/deployments change elsewhere. */
export function useReleasesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('releases:join');
    if (socket.connected) join();
    socket.on('connect', join);
    const onChanged = () => {
      void qc.invalidateQueries({ queryKey: ['releases'] });
      void qc.invalidateQueries({ queryKey: ['release'] });
      void qc.invalidateQueries({ queryKey: ['environments'] });
    };
    socket.on('releases:changed', onChanged);
    return () => {
      socket.emit('releases:leave');
      socket.off('connect', join);
      socket.off('releases:changed', onChanged);
    };
  }, [qc]);
}
