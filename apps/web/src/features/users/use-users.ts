import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AssignRolesInput, CreateUserInput, ListUsersQuery } from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { usersApi } from './users.api';

const usersKey = (query: Partial<ListUsersQuery>) => ['users', query] as const;

export function useUsers(query: Partial<ListUsersQuery>) {
  return useQuery({
    queryKey: usersKey(query),
    queryFn: () => usersApi.list(query),
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useAssignRoles(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignRolesInput }) =>
      usersApi.assignRoles(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Roles updated');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
