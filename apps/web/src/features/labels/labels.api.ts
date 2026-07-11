import { api } from '@/lib/api-client';
import type { CreateLabelInput, LabelDto, UpdateLabelInput } from '@eop/shared';

export const labelsApi = {
  list: () => api.get<LabelDto[]>('/labels').then((r) => r.data),
  create: (input: CreateLabelInput) => api.post<LabelDto>('/labels', input).then((r) => r.data),
  update: (id: string, input: UpdateLabelInput) =>
    api.patch<LabelDto>(`/labels/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/labels/${id}`).then((r) => r.data),
};
