import { useOS, type SoundCue } from "../store";

export type UiSound = "type" | "click" | "toggle" | "open" | "close" | "focus" | "maximize" | "notification" | "alarm" | "drop" | "adjust";
let context: AudioContext | undefined;
let master: GainNode | undefined;
let lastSoundAt = 0;
let lastTypingAt = -1;

function audio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return undefined;
  try {
    if (!context || context.state === "closed") { context = new AudioContext(); master = undefined; }
    if (!master) { master = context.createGain(); master.connect(context.destination); }
    master.gain.setTargetAtTime(useOS.getState().prefs.sfxVolume * 2, context.currentTime, 0.04);
    return context;
  } catch { return undefined; }
}

export function unlockUiAudio() {
  const ctx = audio();
  if (ctx && ctx.state !== "running") void ctx.resume().catch(() => {});
}

export async function playUiSound(type: UiSound, options: { force?: boolean } = {}) {
  const prefs = useOS.getState().prefs;
  if (!options.force && (!prefs.sound || prefs.sfxVolume <= 0)) return false;
  const ctx = audio();
  if (!ctx || !master || ctx.state === "closed") return false;
  // Schedule after resume so the first interaction is audible too.
  if (ctx.state !== "running") {
    try { await ctx.resume(); } catch { return false; }
  }
  if (ctx.state !== "running") return false;
  const now = ctx.currentTime;
  if (type === "click" && lastSoundAt > 0 && now - lastSoundAt < 0.035) return false;
  if (type === "type") {
    if (!prefs.typingSound || now - lastTypingAt < 0.025) return false;
    lastTypingAt = now;
  }
  lastSoundAt = now;
  const play = (frequency: number, endFrequency: number, delay: number, length: number, volume: number, wave: OscillatorType = "sine") => {
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    const start = now + delay, end = start + length;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), end);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.008, length / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope); envelope.connect(master!);
    oscillator.start(start); oscillator.stop(end + 0.006);
  };
  switch (type) {
    case "type": play(260 + Math.random() * 60, 130, 0, 0.035, 0.065, "triangle"); break;
    case "click": play(520, 410, 0, 0.065, 0.12, "triangle"); break;
    case "toggle": play(540, 690, 0, 0.075, 0.09); play(780, 900, 0.035, 0.08, 0.055); break;
    case "open": play(420, 580, 0, 0.12, 0.075); play(620, 820, 0.055, 0.12, 0.045); break;
    case "close": play(600, 390, 0, 0.11, 0.07); break;
    case "focus": play(470, 600, 0, 0.07, 0.05); break;
    case "maximize": play(430, 720, 0, 0.14, 0.065); break;
    case "notification": play(620, 700, 0, 0.11, 0.065); play(830, 900, 0.09, 0.14, 0.055); break;
    case "alarm": play(660, 660, 0, 0.18, 0.09); play(550, 550, 0.2, 0.18, 0.08); play(660, 660, 0.4, 0.22, 0.09); break;
    case "drop": play(380, 600, 0, 0.12, 0.07); break;
    case "adjust": play(450, 560, 0, 0.05, 0.04); break;
  }
  return true;
}

export function soundForNotification(cue: SoundCue) { playUiSound(cue); }
