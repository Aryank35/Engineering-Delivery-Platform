import { api } from '@/lib/api-client';
import type { AnalyticsOverview, QaAnalytics, SprintBurndown, VelocityPoint } from '@eop/shared';

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview').then((r) => r.data),
  velocity: () => api.get<VelocityPoint[]>('/analytics/velocity').then((r) => r.data),
  qa: () => api.get<QaAnalytics>('/analytics/qa').then((r) => r.data),
  burndown: (sprintId: string) =>
    api.get<SprintBurndown>(`/sprints/${sprintId}/burndown`).then((r) => r.data),
};
