import { useEffect } from "react";
import { useClock } from "./clockStore";
import { useOS } from "../../store";
import { unlockUiAudio } from "../../services/sounds";
export function enableClockSound() {
  unlockUiAudio();
}
export function useClockEngine(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const state = useClock.getState(),
        now = Date.now();
      if (state.timer.deadline !== null && state.timer.deadline <= now) {
        state.update({ timer: { deadline: null, remaining: 0 } });
        useOS
          .getState()
          .notify("Timer finished", "Your FakeOS timer is complete.", "alarm");
      }
      const due = state.alarms.filter((a) => a.enabled && a.nextAt <= now);
      if (due.length) {
        state.update({
          alarms: state.alarms.map((a) =>
            due.some((d) => d.id === a.id) ? { ...a, enabled: false } : a,
          ),
        });
        for (const alarm of due)
          useOS.getState().notify("Alarm", alarm.label || alarm.time, "alarm");
      }
    };
    check();
    const interval = setInterval(check, 500);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled]);
}
