import { useEffect } from "react";
import { useClock } from "./clockStore";
import { useOS } from "../../store";
let audio: AudioContext | undefined;
export function enableClockSound() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    /* Visual notifications remain available. */
  }
}
function ring() {
  if (!useOS.getState().prefs.sound || !audio || audio.state !== "running")
    return;
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.15, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.7);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.7);
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
          .notify("Timer finished", "Your FakeOS timer is complete.");
        ring();
      }
      const due = state.alarms.filter((a) => a.enabled && a.nextAt <= now);
      if (due.length) {
        state.update({
          alarms: state.alarms.map((a) =>
            due.some((d) => d.id === a.id) ? { ...a, enabled: false } : a,
          ),
        });
        for (const alarm of due)
          useOS.getState().notify("Alarm", alarm.label || alarm.time);
        ring();
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
