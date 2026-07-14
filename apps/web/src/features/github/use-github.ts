import { useQuery } from '@tanstack/react-query';
import { githubApi } from './github.api';

export function useWorkItemDevActivity(workItemId: string | undefined) {
  return useQuery({
    queryKey: ['github', 'work-item', workItemId],
    queryFn: () => githubApi.devActivity(workItemId as string),
    enabled: Boolean(workItemId),
  });
}

export function useGithubStatus() {
  return useQuery({ queryKey: ['github', 'status'], queryFn: () => githubApi.status() });
}
