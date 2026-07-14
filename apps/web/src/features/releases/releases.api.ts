import { api } from '@/lib/api-client';
import type {
  CreateDeploymentInput,
  CreateEnvironmentInput,
  CreateReleaseInput,
  DeploymentDto,
  EnvironmentDto,
  EnvironmentStatusDto,
  ListReleasesQuery,
  Paginated,
  ReleaseDetail,
  ReleaseItemsInput,
  ReleaseStatus,
  ReleaseSummary,
  UpdateDeploymentInput,
  UpdateEnvironmentInput,
  UpdateReleaseInput,
} from '@eop/shared';

export const releasesApi = {
  list: (query: Partial<ListReleasesQuery>) =>
    api.get<Paginated<ReleaseSummary>>('/releases', { params: query }).then((r) => r.data),
  get: (id: string) => api.get<ReleaseDetail>(`/releases/${id}`).then((r) => r.data),
  create: (input: CreateReleaseInput) =>
    api.post<ReleaseDetail>('/releases', input).then((r) => r.data),
  update: (id: string, input: UpdateReleaseInput) =>
    api.patch<ReleaseDetail>(`/releases/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: boolean }>(`/releases/${id}`).then((r) => r.data),
  setStatus: (id: string, status: ReleaseStatus) =>
    api.post<ReleaseDetail>(`/releases/${id}/status`, { status }).then((r) => r.data),
  addItems: (id: string, input: ReleaseItemsInput) =>
    api.post<ReleaseDetail>(`/releases/${id}/items`, input).then((r) => r.data),
  removeItems: (id: string, input: ReleaseItemsInput) =>
    api.delete<ReleaseDetail>(`/releases/${id}/items`, { data: input }).then((r) => r.data),
  deploy: (id: string, input: CreateDeploymentInput) =>
    api.post<DeploymentDto>(`/releases/${id}/deployments`, input).then((r) => r.data),
  updateDeployment: (id: string, deploymentId: string, input: UpdateDeploymentInput) =>
    api
      .patch<DeploymentDto>(`/releases/${id}/deployments/${deploymentId}`, input)
      .then((r) => r.data),
};

export const environmentsApi = {
  list: () => api.get<EnvironmentDto[]>('/environments').then((r) => r.data),
  status: () => api.get<EnvironmentStatusDto[]>('/environments/status').then((r) => r.data),
  create: (input: CreateEnvironmentInput) =>
    api.post<EnvironmentDto>('/environments', input).then((r) => r.data),
  update: (id: string, input: UpdateEnvironmentInput) =>
    api.patch<EnvironmentDto>(`/environments/${id}`, input).then((r) => r.data),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/environments/${id}`).then((r) => r.data),
};
