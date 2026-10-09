import WorkspaceBackup from "../../components/WorkspaceBackup";
import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Settings() {
  const { prefs: p, setPrefs } = useOS();
  const [usage, setUsage] = useState("");
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
