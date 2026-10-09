import { useEffect, useState } from "react";
import { fs, type Entry } from "../services/filesystem";
import { useOS } from "../store";

export default function DesktopWidgets() {
  const [now, setNow] = useState(new Date());
  const [note, setNote] = useState<Entry>();
  const open = useOS(s => s.open);
  const wallpaper = useOS(s => s.prefs.wallpaper);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const load = () => void fs.all().then(entries => setNote(entries.filter(e => e.mime === "application/fakeos-note" && e.parent !== "Trash").sort((a,b) => Number(!!b.pinned)-Number(!!a.pinned))[0]));
    load(); window.addEventListener("fakeos-files-changed", load);
    return () => { clearInterval(timer); window.removeEventListener("fakeos-files-changed", load); };
  }, []);
  return <aside className="desktop-widgets" aria-label="Desktop widgets">
    <button className="widget-card widget-clock" onClick={() => open("Clock")}><small>{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</small><strong>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span>Open Clock ↗</span></button>
    <button className="widget-card widget-note" onClick={() => open("Notes")}><small>QUICK NOTE</small><strong>{note?.name || "Capture a thought"}</strong><span>{note?.content?.slice(0, 90) || "Tap to open Notes and jot something down."}</span></button>
    <button className="widget-card widget-weather" onClick={() => open("Settings")}><small>WALLPAPER FORECAST · SIMULATED</small><strong>{wallpaper === "ocean" ? "🌊 Ocean breeze" : wallpaper === "dusk" ? "🌅 Golden hour" : wallpaper === "midnight" ? "🌙 Clear night" : "✨ Aurora skies"}</strong><span>A playful mood from your current wallpaper, not real weather.</span></button>
    <button className="widget-add" onClick={() => open("Settings")}>Customize widgets · Settings</button>
  </aside>;
}
