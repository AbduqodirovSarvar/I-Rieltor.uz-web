export interface Remaining {
  /** Whole milliseconds left, never below zero. */
  ms: number;
  days: number;
  /** `HH:MM:SS` */
  clock: string;
  finished: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Splits the time left until `targetMs` (by the server clock) into days and a `HH:MM:SS` clock. */
export function remaining(targetMs: number, nowMs: number): Remaining {
  const ms = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { ms, days, clock: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, finished: ms === 0 };
}
