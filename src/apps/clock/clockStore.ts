import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface Alarm {
  id: string;
  time: string;
  label: string;
  nextAt: number;
  enabled: boolean;
}
interface ClockState {
  alarms: Alarm[];
  timer: { deadline: number | null; remaining: number };
  stopwatch: { startedAt: number | null; elapsed: number; laps: number[] };
  update: (changes: Partial<Omit<ClockState, "update">>) => void;
}
export function nextAlarm(time: string, now = Date.now()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw Error("Choose a valid alarm time.");
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= now) date.setDate(date.getDate() + 1);
  return date.getTime();
}
export const useClock = create<ClockState>()(
  persist(
    (set) => ({
      alarms: [],
      timer: { deadline: null, remaining: 300000 },
      stopwatch: { startedAt: null, elapsed: 0, laps: [] },
      update: (changes) => set(changes),
    }),
    { name: "fakeos-clock" },
  ),
);
export const elapsedAt = (
  startedAt: number | null,
  elapsed: number,
  now = Date.now(),
) => elapsed + (startedAt === null ? 0 : Math.max(0, now - startedAt));
