import { useEffect, useRef, useState } from "react";
import { apps, type AppId, useOS } from "../store";
import { fs, type Entry } from "../services/filesystem";
import { createShortcut, openEntry, shortcutMime } from "../services/shortcuts";
import Icon from "./Icon";
const defaults: AppId[] = ["Files", "Browser", "Notes", "Terminal", "Settings", "Store", "Games"];
export default function DesktopIcons() {
  const [entries, setEntries] = useState<Entry[]>([]),
    [menu, setMenu] = useState<Entry | null>(null),
    [create, setCreate] = useState(false),
    [app, setApp] = useState<AppId>("Paint"),
    [title, setTitle] = useState("Paint"),
    [positions, setPositions] = useState<
      Record<string, { x: number; y: number }>
    >(() => {
      try {
        if (!localStorage.getItem("fakeos-desktop-grid-version")) {
          localStorage.removeItem("fakeos-desktop-positions");
          localStorage.setItem("fakeos-desktop-grid-version", "1");
        }
        return JSON.parse(
          localStorage.getItem("fakeos-desktop-positions") || "{}",
        );
      } catch {
        return {};
      }
    });
  const moved = useRef(false);
  const dragStart = useRef<{ key: string; index: number; x: number; y: number; element: HTMLElement } | null>(null);
  const rows = Math.max(1, Math.floor((innerHeight - 150) / 90));
  const snapIcons = useOS(s => s.prefs.snapIcons);
  const notify = useOS((s) => s.notify);
  const load = () =>
    fs
      .all()
      .then((all) => setEntries(all.filter((f) => f.parent === "Desktop")))
      .catch((e) => notify("Desktop unavailable", String(e)));
  useEffect(() => {
    load();
    window.addEventListener("fakeos-files-changed", load);
    const sort = () => {
      setPositions({});
      localStorage.removeItem("fakeos-desktop-positions");
    };
    window.addEventListener("fakeos-sort-icons", sort);
    const restore = () => {
      try {
        setPositions(
          JSON.parse(localStorage.getItem("fakeos-desktop-positions") || "{}"),
        );
      } catch {
        setPositions({});
      }
    };
    const resetGrid = () => { setPositions({}); localStorage.removeItem("fakeos-desktop-positions"); };
    window.addEventListener("fakeos-layout-restored", restore);
    window.addEventListener("fakeos-reset-icon-grid", resetGrid);
    return () => {
      window.removeEventListener("fakeos-files-changed", load);
      window.removeEventListener("fakeos-sort-icons", sort);
      window.removeEventListener("fakeos-layout-restored", restore);
      window.removeEventListener("fakeos-reset-icon-grid", resetGrid);
    };
  }, []);
  const slot = (key: string, index: number) => snapIcons ? positions[key] || { x: Math.floor(index / rows), y: index % rows } : positions[key] || { x: 0, y: 0 };
  const drag = (e: React.PointerEvent, key: string, index: number) => {
    if (e.button !== 0) return;
    moved.current = false;
    const element = e.currentTarget as HTMLElement;
    dragStart.current = { key, index, x: e.clientX, y: e.clientY, element };
    element.setPointerCapture(e.pointerId);
  };
  const finishDrag = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) < 10) return;
    moved.current = true;
    const rect = start.element.parentElement!.getBoundingClientRect();
    const cols = Math.max(1, Math.floor((rect.width - 36) / 96));
    const from = slot(start.key, start.index);
    const to = snapIcons ? { x: Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - rect.left - 20) / 96))), y: Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - rect.top - 20) / 90))) } : { x: Math.max(-100, Math.min(innerWidth - 120, from.x + dx)), y: Math.max(-50, Math.min(innerHeight - 180, from.y + dy)) };
    const occupied = snapIcons && items.find((item, index) => item.key !== start.key && slot(item.key, index).x === to.x && slot(item.key, index).y === to.y);
    const next = { ...positions, [start.key]: to };
    if (occupied) next[occupied.key] = from;
    setPositions(next);
    localStorage.setItem("fakeos-desktop-positions", JSON.stringify(next));
  };
  const items = [
    ...defaults.map((a) => ({
      key: a,
      title: a,
      app: a,
      entry: undefined as Entry | undefined,
    })),
    ...entries.map((e) => {
      let icon: AppId =
        e.kind === "folder"
          ? "Files"
          : e.mime.startsWith("image/")
            ? "Paint"
            : "Editor";
      if (e.mime === shortcutMime) {
        try {
          const value = JSON.parse(e.content);
          if (apps.includes(value.app)) icon = value.app;
        } catch {
          /* Keep a file icon for invalid shortcuts. */
        }
      }
      return { key: e.id, title: e.name, app: icon, entry: e };
    }),
  ];
  return (
    <>
      <div
        className="desktop-icons desktop-icon-layout"
        style={{
          gridTemplateRows: `repeat(${rows},90px)`,
          gridTemplateColumns: `repeat(auto-fill, 96px)`,
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            style={{
              ...(snapIcons ? { gridColumn: slot(item.key, index).x + 1, gridRow: slot(item.key, index).y + 1, transform: "none" } : { transform: `translate(${slot(item.key, index).x}px,${slot(item.key, index).y}px)` }),
            }}
            onPointerDown={(e) => drag(e, item.key, index)}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onDoubleClick={() => {
              if (!moved.current) {
                if (item.entry)
                  openEntry(item.entry).catch((e) =>
                    notify("Cannot open shortcut", String(e)),
                  );
                else useOS.getState().open(item.app);
              }
            }}
            onClick={() => {
              if (matchMedia("(pointer: coarse)").matches && !moved.current) {
                if (item.entry)
                  openEntry(item.entry).catch((e) =>
                    notify("Cannot open item", String(e)),
                  );
                else useOS.getState().open(item.app);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (item.entry)
                  openEntry(item.entry).catch((e) =>
                    notify("Cannot open item", String(e)),
                  );
                else useOS.getState().open(item.app);
              }
            }}
            onContextMenu={(e) => {
              if (item.entry) {
                e.preventDefault();
                e.stopPropagation();
                setMenu(item.entry);
              }
            }}
          >
            <Icon app={item.app} />
            <span>
              {item.title}
              {item.entry?.mime === shortcutMime ? " ↗" : ""}
            </span>
          </button>
        ))}
      </div>
      <button
        className="desktop-shortcut-create"
        onClick={() => setCreate(true)}
      >
        + Shortcut
      </button>
      {menu && (
        <div
          className="desktop-shortcut-dialog glass"
          role="dialog"
          aria-label="Shortcut actions"
        >
          <h3>{menu.name}</h3>
          <button
            onClick={() => {
              const name = prompt("Shortcut name", menu.name);
              if (name)
                fs.put({ ...menu, name }).catch((e) =>
                  notify("Rename failed", String(e)),
                );
              setMenu(null);
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              fs.put({
                ...menu,
                parent: "Trash",
                originalParent: "Desktop",
              }).catch((e) => notify("Delete failed", String(e)));
              setMenu(null);
            }}
          >
            Remove from desktop
          </button>
          <button onClick={() => setMenu(null)}>Close</button>
        </div>
      )}
      {create && (
        <div
          className="desktop-shortcut-dialog glass"
          role="dialog"
          aria-label="Create desktop shortcut"
        >
          <h3>Create desktop shortcut</h3>
          <label>
            Application
            <select
              aria-label="Shortcut application"
              value={app}
              onChange={(e) => {
                setApp(e.target.value as AppId);
                setTitle(e.target.value);
              }}
            >
              {apps.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              aria-label="Shortcut name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button
            disabled={!title.trim()}
            onClick={() =>
              createShortcut(title.trim(), { app })
                .then(() => setCreate(false))
                .catch((e) => notify("Shortcut failed", String(e)))
            }
          >
            Create shortcut
          </button>
          <button onClick={() => setCreate(false)}>Cancel</button>
        </div>
      )}
    </>
  );
}
