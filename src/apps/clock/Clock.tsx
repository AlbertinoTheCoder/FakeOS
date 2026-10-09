import { useEffect, useState } from "react";
import { elapsedAt, nextAlarm, useClock } from "./clockStore";
import { enableClockSound } from "./engine";
const duration = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(seconds / 60) % 60 < 10 ? "0" : ""}${Math.floor(seconds / 60) % 60}:${(seconds % 60).toString().padStart(2, "0")}`;
};
export default function Clock() {
  const state = useClock();
  const [now, setNow] = useState(Date.now()),
    [tab, setTab] = useState("Clock"),
    [time, setTime] = useState("08:00"),
    [label, setLabel] = useState(""),
    [minutes, setMinutes] = useState(5);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  const elapsed = elapsedAt(
    state.stopwatch.startedAt,
    state.stopwatch.elapsed,
    now,
  );
  const remaining =
    state.timer.deadline === null
      ? state.timer.remaining
      : Math.max(0, state.timer.deadline - now);
  return (
    <div className="clock-app">
      <nav className="toolbar wrap">
        {["Clock", "Alarms", "Timer", "Stopwatch"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Clock" ? (
        <div className="clock-face">
          <h1>{new Date(now).toLocaleTimeString()}</h1>
          <p>
            {new Date(now).toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small>
        </div>
      ) : tab === "Alarms" ? (
        <section>
          <h2>Alarms</h2>
          <form
            className="toolbar wrap"
            onSubmit={(e) => {
              e.preventDefault();
              enableClockSound();
              state.update({
                alarms: [
                  ...state.alarms,
                  {
                    id: crypto.randomUUID(),
                    time,
                    label,
                    nextAt: nextAlarm(time),
                    enabled: true,
                  },
                ],
              });
              setLabel("");
            }}
          >
            <input
              aria-label="Alarm time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <input
              aria-label="Alarm label"
              placeholder="Alarm label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button>Add alarm</button>
          </form>
          {state.alarms.map((a) => (
            <div className="toolbar" key={a.id}>
              <strong>
                {a.time} {a.label}
              </strong>
              <label>
                <input
                  aria-label={"Enable " + (a.label || a.time)}
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => {
                    enableClockSound();
                    state.update({
                      alarms: state.alarms.map((v) =>
                        v.id === a.id
                          ? {
                              ...v,
                              enabled: e.target.checked,
                              nextAt: nextAlarm(v.time),
                            }
                          : v,
                      ),
                    });
                  }}
                />
                On
              </label>
              <button
                onClick={() =>
                  state.update({
                    alarms: state.alarms.filter((v) => v.id !== a.id),
                  })
                }
              >
                Delete alarm
              </button>
            </div>
          ))}
        </section>
      ) : tab === "Timer" ? (
        <section>
          <h2>Timer</h2>
          <output className="time-display" aria-label="Timer remaining">
            {duration(remaining)}
          </output>
          <label>
            Minutes
            <input
              aria-label="Timer minutes"
              type="number"
              min=".01"
              max="1440"
              step=".01"
              disabled={state.timer.deadline !== null}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <div className="toolbar wrap">
            <button
              disabled={
                state.timer.deadline !== null ||
                !Number.isFinite(minutes) ||
                minutes <= 0 ||
                minutes > 1440
              }
              onClick={() => {
                enableClockSound();
                state.update({
                  timer: {
                    deadline: Date.now() + minutes * 60000,
                    remaining: minutes * 60000,
                  },
                });
              }}
            >
              Start timer
            </button>
            <button
              disabled={state.timer.deadline === null}
              onClick={() =>
                state.update({ timer: { deadline: null, remaining } })
              }
            >
              Pause timer
            </button>
            <button
              disabled={state.timer.deadline !== null || remaining <= 0}
              onClick={() => {
                enableClockSound();
                state.update({
                  timer: { deadline: Date.now() + remaining, remaining },
                });
              }}
            >
              Resume timer
            </button>
            <button
              onClick={() =>
                state.update({
                  timer: {
                    deadline: null,
                    remaining: Math.max(0, minutes * 60000),
                  },
                })
              }
            >
              Reset timer
            </button>
          </div>
        </section>
      ) : (
        <section>
          <h2>Stopwatch</h2>
          <output className="time-display" aria-label="Stopwatch elapsed">
            {duration(elapsed)}.
            {Math.floor((elapsed % 1000) / 10)
              .toString()
              .padStart(2, "0")}
          </output>
          <div className="toolbar wrap">
            <button
              disabled={state.stopwatch.startedAt !== null}
              onClick={() =>
                state.update({
                  stopwatch: { ...state.stopwatch, startedAt: Date.now() },
                })
              }
            >
              Start stopwatch
            </button>
            <button
              disabled={state.stopwatch.startedAt === null}
              onClick={() =>
                state.update({
                  stopwatch: { ...state.stopwatch, elapsed, startedAt: null },
                })
              }
            >
              Pause stopwatch
            </button>
            <button
              disabled={state.stopwatch.startedAt === null}
              onClick={() =>
                state.update({
                  stopwatch: {
                    ...state.stopwatch,
                    laps: [elapsed, ...state.stopwatch.laps],
                  },
                })
              }
            >
              Lap
            </button>
            <button
              onClick={() =>
                state.update({
                  stopwatch: { startedAt: null, elapsed: 0, laps: [] },
                })
              }
            >
              Reset stopwatch
            </button>
          </div>
          {state.stopwatch.laps.map((lap, i) => (
            <p key={i}>
              Lap {state.stopwatch.laps.length - i}: {duration(lap)}.
              {Math.floor((lap % 1000) / 10)
                .toString()
                .padStart(2, "0")}
            </p>
          ))}
        </section>
      )}
      <footer>
        Keep FakeOS open for alarms and timers. Background browser tabs can
        delay alerts. Sound requires interacting with Clock first.
      </footer>
    </div>
  );
}
