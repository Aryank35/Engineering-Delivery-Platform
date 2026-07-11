export const TIME_LOG_SOURCES = ['TIMER', 'MANUAL'] as const;
export type TimeLogSource = (typeof TIME_LOG_SOURCES)[number];

export const TIMER_STATUSES = ['RUNNING', 'PAUSED'] as const;
export type TimerStatus = (typeof TIMER_STATUSES)[number];

/** Total elapsed seconds for a timer, given the current time. */
export function computeElapsedSeconds(
  accumulatedSeconds: number,
  status: TimerStatus,
  lastStartedAtMs: number | null,
  nowMs: number,
): number {
  const running =
    status === 'RUNNING' && lastStartedAtMs != null
      ? Math.max(0, Math.floor((nowMs - lastStartedAtMs) / 1000))
      : 0;
  return accumulatedSeconds + running;
}

/** Compact human duration, e.g. 5400 → "1h 30m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

/** Clock-style duration, e.g. 5400 → "1:30:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${h}:${pad(m)}:${pad(sec)}`;
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
