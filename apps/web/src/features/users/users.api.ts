import { api } from '@/lib/api-client';
import type {
  AssignRolesInput,
  CreateUserInput,
  ListUsersQuery,
  Paginated,
  PublicUser,
  UpdateUserInput,
} from '@eop/shared';

export const usersApi = {
  list: (query: Partial<ListUsersQuery>) =>
    api.get<Paginated<PublicUser>>('/users', { params: query }).then((r) => r.data),
  get: (id: string) => api.get<PublicUser>(`/users/${id}`).then((r) => r.data),
  create: (input: CreateUserInput) => api.post<PublicUser>('/users', input).then((r) => r.data),
  update: (id: string, input: UpdateUserInput) =>
    api.patch<PublicUser>(`/users/${id}`, input).then((r) => r.data),
  deactivate: (id: string) => api.delete<PublicUser>(`/users/${id}`).then((r) => r.data),
  assignRoles: (id: string, input: AssignRolesInput) =>
    api.patch<PublicUser>(`/users/${id}/roles`, input).then((r) => r.data),
};
