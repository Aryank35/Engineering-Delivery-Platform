import { api } from '@/lib/api-client';
import type {
  ActiveTimerDto,
  CreateTimeLogInput,
  ListTimeLogsQuery,
  Paginated,
  StartTimerInput,
  TimeLogDto,
  TimeSummary,
  UpdateTimeLogInput,
} from '@eop/shared';

export const timeApi = {
  getTimer: () => api.get<ActiveTimerDto | null>('/time/timer').then((r) => r.data),
  start: (input: StartTimerInput) =>
    api.post<ActiveTimerDto>('/time/timer/start', input).then((r) => r.data),
  pause: () => api.post<ActiveTimerDto>('/time/timer/pause').then((r) => r.data),
  resume: () => api.post<ActiveTimerDto>('/time/timer/resume').then((r) => r.data),
  stop: () => api.post<TimeLogDto | null>('/time/timer/stop').then((r) => r.data),
  summary: () => api.get<TimeSummary>('/time/summary').then((r) => r.data),
  listLogs: (query: Partial<ListTimeLogsQuery>) =>
    api.get<Paginated<TimeLogDto>>('/time/logs', { params: query }).then((r) => r.data),
  createLog: (input: CreateTimeLogInput) =>
    api.post<TimeLogDto>('/time/logs', input).then((r) => r.data),
  updateLog: (id: string, input: UpdateTimeLogInput) =>
    api.patch<TimeLogDto>(`/time/logs/${id}`, input).then((r) => r.data),
  deleteLog: (id: string) =>
    api.delete<{ success: boolean }>(`/time/logs/${id}`).then((r) => r.data),
  workItemTotal: (id: string) =>
    api.get<{ seconds: number }>(`/time/work-items/${id}/total`).then((r) => r.data),
};
