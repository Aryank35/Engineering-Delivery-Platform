import { api } from '@/lib/api-client';
import type { GitHubIntegrationStatus, WorkItemDevActivity } from '@eop/shared';

export const githubApi = {
  devActivity: (workItemId: string) =>
    api
      .get<WorkItemDevActivity>(`/integrations/github/work-items/${workItemId}`)
      .then((r) => r.data),
  status: () =>
    api.get<GitHubIntegrationStatus>('/integrations/github/status').then((r) => r.data),
};
