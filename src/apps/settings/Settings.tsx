import { playUiSound } from "../../services/sounds";
import WorkspaceBackup from "../../components/WorkspaceBackup";
import { useEffect, useState } from "react";
import { useOS } from "../../store";
type ThemeProfile = {
  id: string;
  name: string;
  prefs: { theme: string; wallpaper: string; accent: string; opacity: number; alignment: string; sound: boolean; sfxVolume: number };
  layout: Record<string, string>;
};
export default function Settings() {
  const { prefs: p, setPrefs, notify } = useOS();
  const [usage, setUsage] = useState("");
  const [soundStatus, setSoundStatus] = useState("");
  const [themes, setThemes] = useState<ThemeProfile[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem("fakeos-theme-profiles") || "[]"); return Array.isArray(saved) ? saved.filter((x): x is ThemeProfile => x && typeof x.name === "string" && x.prefs && typeof x.prefs === "object" && x.layout && typeof x.layout === "object" && !Array.isArray(x.layout)).map(x => ({ ...x, prefs: { ...x.prefs, sfxVolume: typeof x.prefs.sfxVolume === "number" ? x.prefs.sfxVolume : 0.55 } })) : []; } catch { return []; }
  });
  const saveTheme = () => {
    const name = prompt("Name this theme setup", "My theme");
    if (!name?.trim()) return;
    const layout = Object.fromEntries(Object.keys(localStorage).filter(key => key === "fakeos-desktop-positions" || key === "fakeos-mobile-layout" || key.startsWith("fakeos-icon-")).map(key => [key, localStorage.getItem(key) || ""]));
    const next = [{ id: crypto.randomUUID(), name: name.trim(), prefs: { theme: p.theme, wallpaper: p.wallpaper, accent: p.accent, opacity: p.opacity, alignment: p.alignment, sound: p.sound, sfxVolume: p.sfxVolume }, layout }, ...themes].slice(0, 12);
    try { localStorage.setItem("fakeos-theme-profiles", JSON.stringify(next)); setThemes(next); notify("Theme saved", `“${name.trim()}” is ready to apply later.`); } catch { notify("Theme could not be saved", "Browser storage may be full. Remove a large wallpaper or backup to make room."); }
  };
  const applyTheme = (theme: ThemeProfile) => {
    setPrefs(theme.prefs);
    for (const key of ["fakeos-desktop-positions", "fakeos-mobile-layout", ...Object.keys(localStorage).filter(k => k.startsWith("fakeos-icon-"))]) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(theme.layout)) localStorage.setItem(key, value);
    window.dispatchEvent(new Event("fakeos-layout-restored"));
  };
  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((e) =>
        setUsage(
          `${((e.usage || 0) / 1024 / 1024).toFixed(2)} MB used of ${((e.quota || 0) / 1024 / 1024).toFixed(0)} MB browser quota`,
        ),
      );
  }, []);
  return (
    <div className="settings">
      <h1>Make it yours.</h1>
      <p>Your space. Your rhythm. Your FakeOS.</p>
      <WorkspaceBackup />
      <section>
        <h3>Account</h3>
        <label>
          Username
          <input
            value={p.username}
            onChange={(e) => setPrefs({ username: e.target.value })}
          />
        </label>
        <label>
          Avatar
          <select
            value={p.avatar}
            onChange={(e) => setPrefs({ avatar: e.target.value })}
          >
            {["✦", "🌙", "🌿", "🪐", "🐱"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Lock PIN
          <input
            type="password"
            inputMode="numeric"
            value={p.pin}
            onChange={(e) => setPrefs({ pin: e.target.value })}
          />
        </label>
      </section>
      <section>
        <h3>Personalization</h3>
        <div className="theme-presets" aria-label="Theme presets">
          <b>Theme collections</b>
          <div className="theme-preset-grid">
            {[
              { name: "Aurora", wallpaper: "aurora", accent: "#a78bfa", theme: "dark" },
              { name: "Coast", wallpaper: "ocean", accent: "#54c9c0", theme: "dark" },
              { name: "Golden hour", wallpaper: "dusk", accent: "#ffb36b", theme: "dark" },
              { name: "Paper sky", wallpaper: "ocean", accent: "#5377d2", theme: "light" },
            ].map(t => <button key={t.name} className="theme-preset" onClick={() => setPrefs({ wallpaper: t.wallpaper, accent: t.accent, theme: t.theme })}><span style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.wallpaper === "dusk" ? "#fa8a61" : t.wallpaper === "ocean" ? "#0b8290" : "#37265e"})` }} />{t.name}</button>)}
          </div>
          <div className="saved-themes"><div className="toolbar"><b>Your saved setups</b><button onClick={saveTheme}>Save current setup</button></div>{themes.map(theme => <div className="saved-theme" key={theme.id}><span><i style={{ background: theme.prefs.accent }} />{theme.name}</span><button onClick={() => applyTheme(theme)}>Apply</button><button aria-label={`Delete ${theme.name}`} onClick={() => { const next = themes.filter(x => x.id !== theme.id); setThemes(next); localStorage.setItem("fakeos-theme-profiles", JSON.stringify(next)); }}>Remove</button></div>)}</div>
        </div>
        <label>
          Theme
          <select
            value={p.theme}
            aria-label="Theme"
            onChange={(e) => setPrefs({ theme: e.target.value })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label>
          Wallpaper
          <select
            value={p.wallpaper.startsWith("data:") ? "custom" : p.wallpaper}
            onChange={(e) => setPrefs({ wallpaper: e.target.value })}
          >
            {["aurora", "dusk", "ocean", "midnight"].map((v) => (
              <option key={v}>{v}</option>
            ))}
            <option value="custom" disabled>
              Uploaded wallpaper
            </option>
          </select>
        </label>
        <label>
          Upload wallpaper
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () =>
                  setPrefs({ wallpaper: String(reader.result) });
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
        <label>
          Accent color
          <input
            type="color"
            value={p.accent}
            onChange={(e) => setPrefs({ accent: e.target.value })}
          />
        </label>
        <label>
          Surface opacity
          <input
            type="range"
            min=".5"
            max="1"
            step=".05"
            value={p.opacity}
            onChange={(e) => setPrefs({ opacity: Number(e.target.value) })}
          />
        </label>
      </section>
      <section>
        <h3>System & accessibility</h3>
        <label>Sound effects<input type="checkbox" checked={p.sound} onChange={e => setPrefs({ sound: e.target.checked })} /></label>
        <label>Sound effect volume<input aria-label="Sound effect volume" type="range" min="0" max="1" step=".05" value={p.sfxVolume} disabled={!p.sound} onChange={e => setPrefs({ sfxVolume: Number(e.target.value) })} /></label>
        <button data-sfx="off" disabled={!p.sound || p.sfxVolume === 0} onClick={async () => {
          const played = await playUiSound("notification");
          setSoundStatus(played ? "Test tone played. If you cannot hear it, check your device volume and whether this browser tab is muted." : "The browser could not start audio. Tap Test sound again or check this site's sound permissions.");
        }}>Test sound</button>
        {soundStatus && <p role="status">{soundStatus}</p>}
        <label>Desktop icon snap grid<input type="checkbox" checked={p.snapIcons} onChange={e => { setPrefs({ snapIcons: e.target.checked }); window.dispatchEvent(new Event("fakeos-reset-icon-grid")); }} /></label>
        <label>Desktop widgets<input type="checkbox" checked={p.widgets} onChange={e => setPrefs({ widgets: e.target.checked })} /></label>
        <label>
          Interface
          <select
            value={p.mode}
            onChange={(e) =>
              setPrefs({ mode: e.target.value as typeof p.mode })
            }
          >
            <option value="auto">Automatic</option>
            <option value="desktop">Desktop mode</option>
            <option value="mobile">Mobile mode</option>
          </select>
        </label>
        <label>
          Taskbar alignment
          <select
            value={p.alignment}
            onChange={(e) => setPrefs({ alignment: e.target.value })}
          >
            <option>center</option>
            <option>left</option>
          </select>
        </label>
        <label>
          Reduced motion
          <input
            type="checkbox"
            checked={p.reduced}
            onChange={(e) => setPrefs({ reduced: e.target.checked })}
          />
        </label>
        <label>
          Taskbar auto-hide
          <input
            type="checkbox"
            checked={p.taskbarAutoHide}
            onChange={(e) => setPrefs({ taskbarAutoHide: e.target.checked })}
          />
        </label>
        <label>
          Taskbar icon size
          <input
            aria-label="Taskbar icon size"
            type="range"
            min="28"
            max="46"
            value={p.taskbarSize}
            onChange={(e) => setPrefs({ taskbarSize: Number(e.target.value) })}
          />
        </label>
        <label>
          High contrast
          <input
            type="checkbox"
            checked={p.contrast}
            onChange={(e) => setPrefs({ contrast: e.target.checked })}
          />
        </label>
        <label>
          Focus mode
          <input
            type="checkbox"
            checked={p.focusMode}
            onChange={(e) => setPrefs({ focusMode: e.target.checked })}
          />
        </label>
        <label>
          Workspace brightness
          <input
            aria-label="Workspace brightness"
            type="range"
            min=".45"
            max="1"
            step=".05"
            value={p.brightness}
            onChange={(e) => setPrefs({ brightness: Number(e.target.value) })}
          />
        </label>
        <label>
          Text size
          <input
            type="range"
            min=".85"
            max="1.25"
            step=".05"
            value={p.scale}
            onChange={(e) => setPrefs({ scale: Number(e.target.value) })}
          />
        </label>
        <p>{usage}</p>
        <small>
          FakeOS 1.0 · Browser-based OS. Files are local to this browser, can be
          removed by clearing browser data, and do not sync between devices.
        </small>
      </section>
    </div>
  );
}
