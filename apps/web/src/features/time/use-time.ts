import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ActiveTimerDto, CreateTimeLogInput, StartTimerInput } from '@eop/shared';
import { getApiErrorMessage } from '@/lib/api-client';
import { timeApi } from './time.api';

const TIMER_KEY = ['timer'] as const;

function invalidateTime(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: TIMER_KEY });
  void qc.invalidateQueries({ queryKey: ['time-summary'] });
  void qc.invalidateQueries({ queryKey: ['time-logs'] });
  void qc.invalidateQueries({ queryKey: ['work-item-time'] });
}

export function useActiveTimer() {
  return useQuery({ queryKey: TIMER_KEY, queryFn: () => timeApi.getTimer(), staleTime: 5_000 });
}

export function useTimeSummary() {
  return useQuery({ queryKey: ['time-summary'], queryFn: () => timeApi.summary() });
}

export function useTimerControls() {
  const qc = useQueryClient();
  const onError = (error: unknown) => toast.error(getApiErrorMessage(error));
  const start = useMutation({
    mutationFn: (input: StartTimerInput) => timeApi.start(input),
    onSuccess: () => invalidateTime(qc),
    onError,
  });
  const pause = useMutation({
    mutationFn: () => timeApi.pause(),
    onSuccess: () => invalidateTime(qc),
    onError,
  });
  const resume = useMutation({
    mutationFn: () => timeApi.resume(),
    onSuccess: () => invalidateTime(qc),
    onError,
  });
  const stop = useMutation({
    mutationFn: () => timeApi.stop(),
    onSuccess: () => {
      invalidateTime(qc);
      toast.success('Time logged');
    },
    onError,
  });
  return { start, pause, resume, stop };
}

export function useWorkItemTimeLogs(workItemId: string) {
  return useQuery({
    queryKey: ['time-logs', { workItemId }],
    queryFn: () => timeApi.listLogs({ workItemId, pageSize: 50 }),
  });
}

export function useWorkItemTimeTotal(workItemId: string) {
  return useQuery({
    queryKey: ['work-item-time', workItemId],
    queryFn: () => timeApi.workItemTotal(workItemId),
  });
}

export function useCreateTimeLog(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeLogInput) => timeApi.createLog(input),
    onSuccess: () => {
      invalidateTime(qc);
      toast.success('Time logged');
      onDone?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeApi.deleteLog(id),
    onSuccess: () => invalidateTime(qc),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

/** Live-ticking elapsed seconds for a timer, driven client-side between fetches. */
export function useLiveElapsed(timer: ActiveTimerDto | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const base = useRef({ seconds: 0, at: Date.now() });

  useEffect(() => {
    if (timer) base.current = { seconds: timer.elapsedSeconds, at: Date.now() };
  }, [timer?.id, timer?.elapsedSeconds, timer?.status]);

  useEffect(() => {
    if (timer?.status !== 'RUNNING') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer?.status, timer?.id]);

  if (!timer) return 0;
  if (timer.status !== 'RUNNING') return base.current.seconds;
  return base.current.seconds + Math.max(0, Math.floor((now - base.current.at) / 1000));
}
