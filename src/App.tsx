import DesktopIcons from "./components/DesktopIcons";
import DesktopWidgets from "./components/DesktopWidgets";
import { useClockEngine } from "./apps/clock/engine";
import MobileAppGrid from "./components/MobileAppGrid";
import Icon from "./components/Icon";
import ManagedWindow from "./components/ManagedWindow";
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Folder,
  FileText,
  Terminal,
  Calculator,
  StickyNote,
  Paintbrush,
  Music,
  Globe,
  Settings,
  Activity,
  Bell,
  SlidersHorizontal,
  Search,
  Grid2X2,
  Minus,
  Maximize2,
  X,
  Lock,
  Power,
  RotateCcw,
} from "lucide-react";
import { apps, useOS, type AppId, type WindowState } from "./store";
import { detectMobile } from "./device";
import NotificationToast from "./components/NotificationToast";
import { fs } from "./services/filesystem";
import { playUiSound, soundForNotification } from "./services/sounds";
const Application = lazy(() => import("./apps"));
function MobileHomeWidget({ open }: { open: (app: AppId) => void }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    const load = () => void fs.all().then(entries => setNote(entries.find(e => e.mime === "application/fakeos-note" && e.parent !== "Trash")?.content || ""));
    load(); window.addEventListener("fakeos-files-changed", load);
    return () => window.removeEventListener("fakeos-files-changed", load);
  }, []);
  const wallpaper = useOS(s => s.prefs.wallpaper);
  return <div className="mobile-widgets"><button className="mobile-note-widget" onClick={() => open("Notes")}><small>QUICK NOTE</small><span>{note.slice(0, 85) || "Tap to open Notes and jot something down."}</span></button><button className="mobile-weather-widget" onClick={() => open("Settings")}><span>{wallpaper === "ocean" ? "🌊" : wallpaper === "dusk" ? "🌅" : wallpaper === "midnight" ? "🌙" : "✨"}</span><span><b>{wallpaper === "ocean" ? "Ocean breeze" : wallpaper === "dusk" ? "Golden hour" : wallpaper === "midnight" ? "Clear night" : "Aurora skies"}</b><small>Wallpaper mood · simulated</small></span></button></div>;
}
export default function App() {
  const os = useOS(),
    [phase, setPhase] = useState<
      "boot" | "setup" | "running" | "locked" | "off"
    >("boot"),
    [start, setStart] = useState(false),
    [panel, setPanel] = useState(""),
    [search, setSearch] = useState(""),
    [time, setTime] = useState(new Date()),
    [switcher, setSwitcher] = useState(false),
    [context, setContext] = useState<{ x: number; y: number } | null>(null),
    [pin, setPin] = useState(""),
    [page, setPage] = useState(0),
    [iconLayout, setIconLayout] = useState<Record<string, string>>(() => {
      try {
        return Object.fromEntries(
          apps.map((a) => [a, localStorage.getItem("fakeos-icon-" + a) || ""]),
        );
      } catch {
        return {};
      }
    });
  useClockEngine(phase === "running" || phase === "locked");
  const mobile =
    os.prefs.mode === "mobile" || (os.prefs.mode === "auto" && detectMobile());
  useEffect(() => {
    fs.init().catch((e) => os.notify("Storage unavailable", String(e)));
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>("button:not(:disabled),a[href],[role='button'],[role='menuitem'],input[type='checkbox'],input[type='radio'],select,summary,label.button");
      if (!control || control.closest("[data-sfx='off']")) return;
      playUiSound(control.matches("input[type='checkbox'],input[type='radio']") ? "toggle" : "click");
    };
    const change = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "range") playUiSound("adjust");
    };
    const contextMenu = () => playUiSound("click");
    const drop = (event: DragEvent) => { if (event.dataTransfer?.files.length) playUiSound("drop"); };
    document.addEventListener("click", click, true);
    document.addEventListener("change", change, true);
    document.addEventListener("drop", drop);
    document.addEventListener("contextmenu", contextMenu);
    const unsubscribe = useOS.subscribe((state, previous) => {
      const added = state.windows.some(w => !previous.windows.some(old => old.id === w.id));
      const removed = previous.windows.some(w => !state.windows.some(current => current.id === w.id));
      if (added) playUiSound("open");
      else if (removed) playUiSound("close");
      else if (state.active !== previous.active) playUiSound("focus");
      else if (state.windows.some(w => { const old = previous.windows.find(x => x.id === w.id); return old && old.maximized !== w.maximized; })) playUiSound("maximize");
      else if (state.windows.some(w => { const old = previous.windows.find(x => x.id === w.id); return old && old.minimized !== w.minimized; })) playUiSound(state.windows.some(w => { const old = previous.windows.find(x => x.id === w.id); return old && old.minimized && !w.minimized; }) ? "open" : "close");
      const currentNotification = state.notifications[0];
      if (currentNotification && currentNotification.id !== previous.notifications[0]?.id) soundForNotification(currentNotification.cue);
    });
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("drop", drop);
      document.removeEventListener("contextmenu", contextMenu);
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    const onError = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      os.notify("Operation failed", String(event.reason));
    };
    window.addEventListener("unhandledrejection", onError);
    return () => window.removeEventListener("unhandledrejection", onError);
  }, []);
  useEffect(() => {
    if (phase === "boot") {
      const timeout = setTimeout(
        () => setPhase(os.prefs.setup ? "locked" : "setup"),
        500,
      );
      return () => clearTimeout(timeout);
    }
  }, [phase]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStart(false);
        setPanel("");
        setContext(null);
        setSwitcher(false);
      }
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        const i = os.windows.findIndex((w) => w.id === os.active);
        if (os.windows.length)
          os.focus(os.windows[(i + 1) % os.windows.length].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [os.windows, os.active]);
  useEffect(() => {
    const resize = () => {
      for (const w of useOS.getState().windows)
        os.update(w.id, {
          x: Math.max(
            0,
            Math.min(w.x, innerWidth - Math.min(w.width, innerWidth - 12)),
          ),
          y: Math.max(
            38,
            Math.min(
              w.y,
              innerHeight - Math.min(w.height, innerHeight - 118) - 80,
            ),
          ),
          width: Math.min(w.width, innerWidth - 12),
          height: Math.min(w.height, innerHeight - 90),
        });
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const open = (app: AppId) => {
    os.open(app);
    setStart(false);
    setSwitcher(false);
    setContext(null);
  };
  const wallpaper = os.prefs.wallpaper.startsWith("data:")
    ? { backgroundImage: `url(${os.prefs.wallpaper})` }
    : {};
  return (
    <div
      className={`os wallpaper-${os.prefs.wallpaper.startsWith("data:") ? "custom" : os.prefs.wallpaper} ${os.prefs.theme} ${os.prefs.contrast ? "high-contrast" : ""} ${mobile ? "mobile" : "desktop"} ${os.prefs.reduced ? "reduced" : ""}`}
      style={
        {
          ...wallpaper,
          "--accent": os.prefs.accent,
          "--surface-opacity": os.prefs.opacity,
          "--taskbar-icon-size": `${os.prefs.taskbarSize}px`,
          fontSize: `${os.prefs.scale * 14}px`,
        } as React.CSSProperties & Record<string, string | number>
      }
    >
      <NotificationToast />
      <div
        aria-hidden="true"
        className="workspace-dimmer"
        style={{ opacity: 1 - os.prefs.brightness }}
      />
      {phase === "boot" ? (
        <div className="center-screen">
          <div className="os-logo">✦</div>
          <h1>FakeOS</h1>
          <p>A little space for everything.</p>
          <div className="loader" />
          <button onClick={() => setPhase(os.prefs.setup ? "locked" : "setup")}>
            Skip startup
          </button>
        </div>
      ) : phase === "setup" ? (
        <div className="center-screen">
          <div className="setup glass">
            <div className="os-logo">✦</div>
            <h1>Welcome to your space.</h1>
            <p>Meet FakeOS. Familiar, with a fresh perspective.</p>
            <label>
              Your name
              <input
                autoFocus
                value={os.prefs.username}
                onChange={(e) => os.setPrefs({ username: e.target.value })}
              />
            </label>
            <label>
              Choose an avatar
              <select
                value={os.prefs.avatar}
                onChange={(e) => os.setPrefs({ avatar: e.target.value })}
              >
                {["✦", "🌙", "🌿", "🪐", "🐱"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <div className="wallpaper-picker">
              {["aurora", "dusk", "ocean", "midnight"].map((w) => (
                <button
                  aria-label={w + " wallpaper"}
                  key={w}
                  className={`wallpaper-${w} ${os.prefs.wallpaper === w ? "chosen" : ""}`}
                  onClick={() => os.setPrefs({ wallpaper: w })}
                />
              ))}
            </div>
            <div className="toolbar">
              <button
                onClick={() =>
                  os.setPrefs({
                    theme: os.prefs.theme === "dark" ? "light" : "dark",
                  })
                }
              >
                {os.prefs.theme} theme
              </button>
              <input
                aria-label="Accent color"
                type="color"
                value={os.prefs.accent}
                onChange={(e) => os.setPrefs({ accent: e.target.value })}
              />
            </div>
            <label>
              Optional lock PIN
              <input
                type="password"
                value={os.prefs.pin}
                onChange={(e) => os.setPrefs({ pin: e.target.value })}
              />
            </label>
            <button
              className="accent"
              onClick={() => {
                os.setPrefs({ setup: true });
                setPhase("running");
                os.notify(
                  "Welcome to FakeOS",
                  "Your workspace is ready. Make yourself at home.",
                );
              }}
            >
              Let's get started →
            </button>
          </div>
        </div>
      ) : phase === "locked" ? (
        <div className="center-screen lock">
          <h1>
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </h1>
          <p>
            {time.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="avatar">{os.prefs.avatar}</div>
          <h2>{os.prefs.username}</h2>
          {os.prefs.pin && (
            <input
              aria-label="Unlock PIN"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
            />
          )}
          <button
            className="glass"
            onClick={() => {
              if (!os.prefs.pin || pin === os.prefs.pin) {
                setPhase("running");
                setPin("");
              } else os.notify("Incorrect PIN", "Try again.");
            }}
          >
            Unlock your space →
          </button>
        </div>
      ) : phase === "off" ? (
        <div className="center-screen">
          <Power size={48} />
          <h2>See you soon.</h2>
          <button onClick={() => setPhase("boot")}>Power on</button>
        </div>
      ) : (
        <>
          <header
            className="system-bar"
            onTouchStart={(e) => {
              e.currentTarget.dataset.y = String(e.touches[0].clientY);
              e.currentTarget.dataset.x = String(e.touches[0].clientX);
            }}
            onTouchEnd={(e) => {
              if (
                mobile &&
                e.changedTouches[0].clientY -
                  Number(e.currentTarget.dataset.y) >
                  35
              )
                setPanel(
                  Number(e.currentTarget.dataset.x) > innerWidth / 2
                    ? "quick"
                    : "notifications",
                );
            }}
          >
            <span>
              ✦ <b>FakeOS</b>
              {!mobile && (
                <span className="system-label"> / your everyday, elevated</span>
              )}
            </span>
            <span>
              {mobile
                ? time.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Local workspace"}{" "}
              <span title="Browser network status">
                {navigator.onLine ? "◉" : "Offline"}
              </span>
            </span>
          </header>
          {mobile ? (
            <>
              <div
                className="mobile-home"
                onTouchStart={(e) => {
                  e.currentTarget.dataset.touchX = String(e.touches[0].clientX);
                }}
                onTouchEnd={(e) => {
                  const startX = Number(e.currentTarget.dataset.touchX);
                  const delta = e.changedTouches[0].clientX - startX;
                  if (Math.abs(delta) > 70) setPage(delta < 0 ? 1 : 0);
                }}
              >
                <div className="mobile-clock">
                  <h1>
                    {time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </h1>
                  <p>
                    {time.toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {os.prefs.widgets && page === 0 && <MobileHomeWidget open={open} />}
                <MobileAppGrid page={page} open={open} />
                <div className="pages">
                  <button
                    aria-label="First home page"
                    onClick={() => setPage(0)}
                  >
                    {page === 0 ? "●" : "○"}
                  </button>
                  <button
                    aria-label="Second home page"
                    onClick={() => setPage(1)}
                  >
                    {page === 1 ? "●" : "○"}
                  </button>
                </div>
                <div className="mobile-dock glass">
                  {os.pinned.slice(0, 4).map((a) => (
                    <button
                      key={a}
                      aria-label={"Open " + a}
                      onClick={() => open(a)}
                    >
                      <Icon app={a} />
                    </button>
                  ))}
                </div>
              </div>
              {os.windows.map((w) => (
                <div
                  key={w.id}
                  className="mobile-app"
                  style={{
                    display: !switcher && os.active === w.id ? "flex" : "none",
                  }}
                >
                  <div className="toolbar">
                    <button onClick={() => os.focus("")}>‹ Home</button>
                    <strong>{w.app}</strong>
                    <button
                      onClick={() => os.close(w.id)}
                      aria-label="Close app"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <Suspense
                    fallback={<div className="empty">Opening application…</div>}
                  >
                    <Application app={w.app} data={w.data} instanceId={w.id} />
                  </Suspense>
                </div>
              ))}
              <nav className="mobile-navigation glass">
                <button
                  aria-label="Notifications"
                  onClick={() =>
                    setPanel(panel === "notifications" ? "" : "notifications")
                  }
                >
                  <Bell size={20} />
                </button>
                <button
                  onClick={() => {
                    os.focus("");
                    setSwitcher(false);
                  }}
                >
                  Home
                </button>
                <button onClick={() => setSwitcher(!switcher)}>Apps</button>
                <button
                  aria-label="Control center"
                  onClick={() => setPanel(panel === "quick" ? "" : "quick")}
                >
                  <SlidersHorizontal size={20} />
                </button>
              </nav>
              <div
                className="gesture-bar"
                onTouchStart={(e) => {
                  e.currentTarget.dataset.y = String(e.touches[0].clientY);
                  e.currentTarget.dataset.time = String(Date.now());
                }}
                onTouchEnd={(e) => {
                  if (
                    Number(e.currentTarget.dataset.y) -
                      e.changedTouches[0].clientY >
                    25
                  ) {
                    if (Date.now() - Number(e.currentTarget.dataset.time) > 400)
                      setSwitcher(true);
                    else {
                      os.focus("");
                      setSwitcher(false);
                    }
                  }
                }}
              />
              {switcher && (
                <div className="app-switcher glass">
                  <h2>Your open apps</h2>
                  {os.windows.map((w) => (
                    <div
                      className="switcher-card"
                      key={w.id}
                      onTouchStart={(e) => {
                        e.currentTarget.dataset.y = String(
                          e.touches[0].clientY,
                        );
                      }}
                      onTouchEnd={(e) => {
                        if (
                          Number(e.currentTarget.dataset.y) -
                            e.changedTouches[0].clientY >
                          80
                        )
                          os.close(w.id);
                      }}
                    >
                      <button
                        onClick={() => {
                          os.focus(w.id);
                          setSwitcher(false);
                        }}
                      >
                        <Icon app={w.app} />
                        {w.app}
                        <small>Tap to resume</small>
                      </button>
                      <button
                        aria-label={"Close " + w.app}
                        onClick={() => os.close(w.id)}
                      >
                        <X />
                      </button>
                    </div>
                  ))}
                  {!os.windows.length && <p>No running apps.</p>}
                  <button
                    onClick={() => {
                      os.focus("");
                      setSwitcher(false);
                    }}
                  >
                    Return home
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="desktop-space"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContext({
                    x: Math.min(e.clientX, innerWidth - 230),
                    y: Math.min(e.clientY, innerHeight - 320),
                  });
                }}
              >
                <DesktopIcons />
                {os.prefs.widgets && <DesktopWidgets />}
                <div className="desktop-greeting">
                  <small>A SPACE TO CALL YOUR OWN</small>
                  <h1>
                    Good{" "}
                    {time.getHours() < 12
                      ? "morning"
                      : time.getHours() < 18
                        ? "afternoon"
                        : "evening"}
                    ,<br />
                    {os.prefs.username}.
                  </h1>
                  <p>Less noise. More possibility.</p>
                </div>
              </div>
              <AnimatePresence>
                {os.windows.map((w) => (
                  <ManagedWindow key={w.id} window={w} />
                ))}
              </AnimatePresence>
              <nav
                className={`taskbar glass align-${os.prefs.alignment} ${os.prefs.taskbarAutoHide && !start && !panel ? "auto-hide" : ""}`}
              >
                <button
                  className={start ? "selected" : ""}
                  aria-label="Start menu"
                  onClick={() => setStart(!start)}
                >
                  <Grid2X2 size={24} />
                </button>
                <button aria-label="Search apps" onClick={() => setStart(true)}>
                  <Search size={21} />
                </button>
                <div className="taskbar-divider" />
                {[
                  ...new Set([...os.pinned, ...os.windows.map((w) => w.app)]),
                ].map((a) => (
                  <button
                    key={a}
                    className={
                      os.windows.find((w) => w.app === a && w.id === os.active)
                        ? "active"
                        : ""
                    }
                    title={a}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      os.pinApp(a);
                    }}
                    onClick={() => {
                      const w = os.windows.find((w) => w.app === a);
                      if (!w) open(a);
                      else if (os.active === w.id && !w.minimized)
                        os.update(w.id, { minimized: true });
                      else os.focus(w.id);
                    }}
                  >
                    <Icon app={a} />
                    {os.windows.some((w) => w.app === a) && (
                      <span className="running-dot" />
                    )}
                  </button>
                ))}
                <div className="tray">
                  <button
                    aria-label="Quick settings"
                    onClick={() => setPanel(panel === "quick" ? "" : "quick")}
                  >
                    <SlidersHorizontal size={19} />
                  </button>
                  <button
                    className="clock"
                    onClick={() =>
                      setPanel(panel === "notifications" ? "" : "notifications")
                    }
                  >
                    {time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <small>
                      {time.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </button>
                  <button
                    aria-label="Notifications"
                    onClick={() =>
                      setPanel(panel === "notifications" ? "" : "notifications")
                    }
                  >
                    <Bell size={18} />
                    <small>{os.notifications.length || ""}</small>
                  </button>
                </div>
              </nav>
            </>
          )}
          {start && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="start-menu glass"
            >
              <div className="search-field">
                <Search size={18} />
                <input
                  autoFocus
                  placeholder="Search your applications"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const a = apps.find((a) =>
                        a.toLowerCase().includes(search.toLowerCase()),
                      );
                      if (a) open(a);
                    }
                  }}
                />
              </div>
              <div className="section-title">
                <b>Your applications</b>
                <small>Everything you need</small>
              </div>
              <div className="start-grid">
                {apps
                  .filter((a) => a.toLowerCase().includes(search.toLowerCase()))
                  .map((a) => (
                    <button key={a} onClick={() => open(a)}>
                      <Icon app={a} />
                      {a}
                    </button>
                  ))}
              </div>
              <div className="start-footer">
                <span>
                  {os.prefs.avatar} {os.prefs.username}
                </span>
                <button
                  title="Lock"
                  onClick={() => {
                    setPhase("locked");
                    setStart(false);
                  }}
                >
                  <Lock size={17} />
                </button>
                <button
                  title="Restart"
                  onClick={() => {
                    setPhase("boot");
                    setStart(false);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  title="Shut down"
                  onClick={() => {
                    setPhase("off");
                    setStart(false);
                  }}
                >
                  <Power size={17} />
                </button>
              </div>
            </motion.div>
          )}
          {panel && (
            <div className="system-panel glass">
              <div className="toolbar">
                <h3>
                  {panel === "quick" ? "Quick settings" : "Notifications"}
                </h3>
                <button aria-label="Close panel" onClick={() => setPanel("")}>
                  <X size={18} />
                </button>
              </div>
              {panel === "quick" ? (
                <>
                  <button
                    aria-pressed={os.prefs.sound}
                    onClick={() => os.setPrefs({ sound: !os.prefs.sound })}
                  >
                    FakeOS audio: {os.prefs.sound ? "on" : "muted"}
                  </button>
                  <button
                    onClick={() =>
                      os.setPrefs({
                        theme: os.prefs.theme === "dark" ? "light" : "dark",
                      })
                    }
                  >
                    ☀{" "}
                    {os.prefs.theme === "dark"
                      ? "Switch to light"
                      : "Switch to dark"}
                  </button>
                  <button
                    onClick={() => os.setPrefs({ reduced: !os.prefs.reduced })}
                  >
                    Motion: {os.prefs.reduced ? "reduced" : "full"}
                  </button>
                  <button
                    aria-pressed={os.prefs.focusMode}
                    onClick={() =>
                      os.setPrefs({ focusMode: !os.prefs.focusMode })
                    }
                  >
                    Focus mode: {os.prefs.focusMode ? "on" : "off"}
                  </button>
                  <label>
                    Workspace brightness
                    <input
                      aria-label="Workspace brightness"
                      type="range"
                      min=".45"
                      max="1"
                      step=".05"
                      value={os.prefs.brightness}
                      onChange={(e) =>
                        os.setPrefs({ brightness: Number(e.target.value) })
                      }
                    />
                  </label>
                  <button
                    onClick={() => {
                      open("Settings");
                      setPanel("");
                    }}
                  >
                    Open Settings →
                  </button>
                  <button onClick={() => setPhase("locked")}>
                    Lock workspace
                  </button>
                  <small>These controls affect FakeOS only.</small>
                </>
              ) : (
                <>
                  <button onClick={() => os.dismiss()}>Clear all</button>
                  {os.notifications.map((n) => (
                    <article key={n.id}>
                      <b>{n.title}</b>
                      <p>{n.message}</p>
                      <button onClick={() => os.dismiss(n.id)}>Dismiss</button>
                    </article>
                  ))}
                  {!os.notifications.length && <p>You're all caught up.</p>}
                </>
              )}
            </div>
          )}
          {context && (
            <div
              className="context-menu glass"
              style={{ left: context.x, top: context.y }}
            >
              {[
                "Refresh",
                "New Folder",
                "New Text Document",
                "Change Wallpaper",
                "Sort Icons",
                "Display Settings",
                "Personalization",
              ].map((item) => (
                <button
                  key={item}
                  onClick={async () => {
                    setContext(null);
                    if (item === "New Folder" || item === "New Text Document") {
                      const name = prompt(
                        "Name",
                        item === "New Folder"
                          ? "New folder"
                          : "New document.txt",
                      );
                      if (name) {
                        await fs.create(
                          name,
                          "Desktop",
                          item === "New Folder" ? "folder" : "file",
                        );
                        open("Files");
                      }
                    } else if (item === "Sort Icons") {
                      for (const a of apps)
                        localStorage.removeItem("fakeos-icon-" + a);
                      setIconLayout({});
                      window.dispatchEvent(new Event("fakeos-sort-icons"));
                      os.notify(
                        "Icons sorted",
                        "Default icon arrangement restored.",
                      );
                    } else if (item === "Refresh")
                      os.notify(
                        "Workspace refreshed",
                        "Your local workspace is up to date.",
                      );
                    else open("Settings");
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
