import { api } from '@/lib/api-client';
import type {
  ActivityDto,
  CommentDto,
  CreateCommentInput,
  CreateWorkItemInput,
  ListWorkItemsQuery,
  MoveWorkItemInput,
  Paginated,
  UpdateCommentInput,
  UpdateWorkItemInput,
  WorkItemDetail,
  WorkItemSummary,
} from '@eop/shared';

export const workItemsApi = {
  list: (query: Partial<ListWorkItemsQuery>) =>
    api.get<Paginated<WorkItemSummary>>('/work-items', { params: query }).then((r) => r.data),
  get: (id: string) => api.get<WorkItemDetail>(`/work-items/${id}`).then((r) => r.data),
  create: (input: CreateWorkItemInput) =>
    api.post<WorkItemDetail>('/work-items', input).then((r) => r.data),
  update: (id: string, input: UpdateWorkItemInput) =>
    api.patch<WorkItemDetail>(`/work-items/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/work-items/${id}`).then((r) => r.data),
  move: (id: string, input: MoveWorkItemInput) =>
    api.post<WorkItemSummary>(`/work-items/${id}/move`, input).then((r) => r.data),
  listComments: (id: string) =>
    api.get<CommentDto[]>(`/work-items/${id}/comments`).then((r) => r.data),
  addComment: (id: string, input: CreateCommentInput) =>
    api.post<CommentDto>(`/work-items/${id}/comments`, input).then((r) => r.data),
  updateComment: (commentId: string, input: UpdateCommentInput) =>
    api.patch<CommentDto>(`/comments/${commentId}`, input).then((r) => r.data),
  deleteComment: (commentId: string) =>
    api.delete<{ success: boolean }>(`/comments/${commentId}`).then((r) => r.data),
  listActivities: (id: string) =>
    api.get<ActivityDto[]>(`/work-items/${id}/activities`).then((r) => r.data),
};
