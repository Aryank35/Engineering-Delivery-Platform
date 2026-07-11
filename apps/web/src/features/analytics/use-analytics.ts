import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export function useOverview() {
  return useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.overview() });
}

export function useVelocity() {
  return useQuery({ queryKey: ['analytics', 'velocity'], queryFn: () => analyticsApi.velocity() });
}

export function useQaAnalytics() {
  return useQuery({ queryKey: ['analytics', 'qa'], queryFn: () => analyticsApi.qa() });
}

export function useBurndown(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['burndown', sprintId],
    queryFn: () => analyticsApi.burndown(sprintId as string),
    enabled: Boolean(sprintId),
  });
}
