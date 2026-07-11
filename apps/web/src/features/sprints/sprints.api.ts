import { api } from '@/lib/api-client';
import type {
  BoardDto,
  CreateSprintInput,
  ListSprintsQuery,
  Paginated,
  SprintAnalytics,
  SprintDto,
  SprintItemsInput,
  UpdateSprintInput,
} from '@eop/shared';

export const sprintsApi = {
  list: (query: Partial<ListSprintsQuery>) =>
    api.get<Paginated<SprintDto>>('/sprints', { params: query }).then((r) => r.data),
  get: (id: string) => api.get<SprintDto>(`/sprints/${id}`).then((r) => r.data),
  create: (input: CreateSprintInput) => api.post<SprintDto>('/sprints', input).then((r) => r.data),
  update: (id: string, input: UpdateSprintInput) =>
    api.patch<SprintDto>(`/sprints/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/sprints/${id}`).then((r) => r.data),
  start: (id: string) => api.post<SprintDto>(`/sprints/${id}/start`).then((r) => r.data),
  complete: (id: string) => api.post<SprintDto>(`/sprints/${id}/complete`).then((r) => r.data),
  addItems: (id: string, input: SprintItemsInput) =>
    api.post<BoardDto>(`/sprints/${id}/items`, input).then((r) => r.data),
  removeItems: (id: string, input: SprintItemsInput) =>
    api.delete<BoardDto>(`/sprints/${id}/items`, { data: input }).then((r) => r.data),
  board: (id: string) => api.get<BoardDto>(`/sprints/${id}/board`).then((r) => r.data),
  analytics: (id: string) => api.get<SprintAnalytics>(`/sprints/${id}/analytics`).then((r) => r.data),
};
