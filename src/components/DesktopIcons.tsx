import { useEffect, useRef, useState } from "react";
import { apps, type AppId, useOS } from "../store";
import { fs, type Entry } from "../services/filesystem";
import { createShortcut, openEntry, shortcutMime } from "../services/shortcuts";
import Icon from "./Icon";
const defaults: AppId[] = ["Files", "Browser", "Notes", "Terminal", "Settings"];
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
        return JSON.parse(
          localStorage.getItem("fakeos-desktop-positions") || "{}",
        );
      } catch {
        return {};
      }
    });
  const moved = useRef(false);
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
    window.addEventListener("fakeos-layout-restored", restore);
    return () => {
      window.removeEventListener("fakeos-files-changed", load);
      window.removeEventListener("fakeos-sort-icons", sort);
      window.removeEventListener("fakeos-layout-restored", restore);
    };
  }, []);
  const drag = (e: React.PointerEvent, key: string, index: number) => {
    if (e.button !== 0) return;
    moved.current = false;
    const original = positions[key] || { x: 0, y: 0 },
      x = e.clientX,
      y = e.clientY;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      const dx = event.clientX - x,
        dy = event.clientY - y;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved.current = true;
      if (moved.current) {
        const row = index % Math.max(1, Math.floor((innerHeight - 150) / 90)),
          column = Math.floor(
            index / Math.max(1, Math.floor((innerHeight - 150) / 90)),
          );
        const next = {
          ...positions,
          [key]: {
            x: Math.max(
              -column * 95,
              Math.min(innerWidth - column * 95 - 115, original.x + dx),
            ),
            y: Math.max(
              -row * 90,
              Math.min(innerHeight - row * 90 - 200, original.y + dy),
            ),
          },
        };
        setPositions(next);
        localStorage.setItem("fakeos-desktop-positions", JSON.stringify(next));
      }
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
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
          gridTemplateRows: `repeat(${Math.max(1, Math.floor((innerHeight - 150) / 90))},90px)`,
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            style={{
              transform: `translate(${positions[item.key]?.x || 0}px,${positions[item.key]?.y || 0}px)`,
            }}
            onPointerDown={(e) => drag(e, item.key, index)}
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
