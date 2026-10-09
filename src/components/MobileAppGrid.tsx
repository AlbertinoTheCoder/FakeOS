import { useEffect, useRef, useState } from "react";
import { apps, type AppId } from "../store";
import Icon from "./Icon";
interface AppFolder {
  id: string;
  name: string;
  apps: AppId[];
}
interface Layout {
  order: AppId[];
  folders: AppFolder[];
}
function load(): Layout {
  try {
    const value = JSON.parse(
      localStorage.getItem("fakeos-mobile-layout") || "{}",
    ) as Partial<Layout>;
    return {
      order: [
        ...new Set([
          ...(Array.isArray(value.order)
            ? value.order.filter((a) => apps.includes(a))
            : []),
          ...apps,
        ]),
      ],
      folders: Array.isArray(value.folders)
        ? value.folders
            .filter(
              (f) =>
                typeof f.id === "string" &&
                typeof f.name === "string" &&
                Array.isArray(f.apps),
            )
            .map((f) => ({
              ...f,
              apps: f.apps.filter((a) => apps.includes(a)),
            }))
        : [],
    };
  } catch {
    return { order: [...apps], folders: [] };
  }
}
export default function MobileAppGrid({
  page,
  open,
}: {
  page: number;
  open: (app: AppId) => void;
}) {
  const [layout, setLayout] = useState(load);
  useEffect(() => {
    const restored = () => setLayout(load());
    window.addEventListener("fakeos-layout-restored", restored);
    return () => window.removeEventListener("fakeos-layout-restored", restored);
  }, []);
  const [organize, setOrganize] = useState(false);
  const [folder, setFolder] = useState<AppFolder | null>(null);
  const [name, setName] = useState("My apps");
  const [selected, setSelected] = useState<AppId[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const save = (next: Layout) => {
    setLayout(next);
    localStorage.setItem("fakeos-mobile-layout", JSON.stringify(next));
  };
  const items = [
    ...layout.order.filter(
      (a) => !layout.folders.some((f) => f.apps.includes(a)),
    ),
    ...layout.folders,
  ];
  const longPress = () => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      setOrganize(true);
    }, 550);
  };
  const cancel = () => {
    clearTimeout(timer.current);
  };
  return (
    <>
      <div className="mobile-grid">
        {items.slice(page * 8, page * 8 + 8).map((item) =>
          typeof item === "string" ? (
            <button
              key={item}
              onPointerDown={longPress}
              onPointerUp={cancel}
              onPointerCancel={cancel}
              onPointerMove={cancel}
              onContextMenu={(e) => {
                e.preventDefault();
                setOrganize(true);
              }}
              onClick={() => {
                if (!held.current) open(item);
              }}
            >
              <Icon app={item} size={28} />
              <span>{item}</span>
            </button>
          ) : (
            <button key={item.id} onClick={() => setFolder(item)}>
              <span className="app-folder-icon">
                {item.apps.slice(0, 4).map((a) => (
                  <Icon key={a} app={a} size={13} />
                ))}
              </span>
              <span>{item.name}</span>
            </button>
          ),
        )}
      </div>
      <button className="organize-apps" onClick={() => setOrganize(true)}>
        Organize apps
      </button>
      {folder && (
        <div
          className="mobile-organizer glass"
          role="dialog"
          aria-label="App folder"
        >
          <div className="toolbar">
            <h3>{folder.name}</h3>
            <button onClick={() => setFolder(null)}>Close folder</button>
          </div>
          <div className="mobile-grid">
            {folder.apps.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setFolder(null);
                  open(a);
                }}
              >
                <Icon app={a} />
                {a}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              save({
                ...layout,
                folders: layout.folders.filter((f) => f.id !== folder.id),
              });
              setFolder(null);
            }}
          >
            Dissolve folder
          </button>
        </div>
      )}
      {organize && (
        <div
          className="mobile-organizer glass"
          role="dialog"
          aria-label="Organize apps"
        >
          <div className="toolbar">
            <h3>Your home screen</h3>
            <button onClick={() => setOrganize(false)}>Done</button>
          </div>
          <p>Move apps, or select two or more to create a folder.</p>
          {layout.order.map((a, index) => (
            <div className="organizer-row" key={a}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(a)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, a]
                        : selected.filter((v) => v !== a),
                    )
                  }
                />
                {a}
              </label>
              <button
                aria-label={"Move " + a + " earlier"}
                disabled={index === 0}
                onClick={() => {
                  const order = [...layout.order];
                  [order[index - 1], order[index]] = [
                    order[index],
                    order[index - 1],
                  ];
                  save({ ...layout, order });
                }}
              >
                ↑
              </button>
              <button
                aria-label={"Move " + a + " later"}
                disabled={index === layout.order.length - 1}
                onClick={() => {
                  const order = [...layout.order];
                  [order[index + 1], order[index]] = [
                    order[index],
                    order[index + 1],
                  ];
                  save({ ...layout, order });
                }}
              >
                ↓
              </button>
            </div>
          ))}
          <label>
            Folder name
            <input
              aria-label="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            disabled={selected.length < 2 || !name.trim()}
            onClick={() => {
              save({
                ...layout,
                folders: [
                  ...layout.folders
                    .map((f) => ({
                      ...f,
                      apps: f.apps.filter((a) => !selected.includes(a)),
                    }))
                    .filter((f) => f.apps.length),
                  {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    apps: selected,
                  },
                ],
              });
              setSelected([]);
              setOrganize(false);
            }}
          >
            Create app folder
          </button>
          {layout.folders.map((f) => (
            <div className="organizer-row" key={f.id}>
              <span>{f.name}</span>
              <button
                onClick={() =>
                  save({
                    ...layout,
                    folders: layout.folders.filter((v) => v.id !== f.id),
                  })
                }
              >
                Dissolve
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
