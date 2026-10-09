import FilePreview from "./FilePreview";
import {
  createShortcut,
  openEntry,
  shortcutMime,
} from "../../services/shortcuts";
import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Files({ data }: { data?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [folder, setFolder] = useState("/"),
    [search, setSearch] = useState(""),
    [selected, select] = useState<string[]>([]),
    [list, setList] = useState(false),
    [preview, setPreview] = useState<Entry | null>(null);
  const os = useOS();
  const refresh = () =>
    fs
      .all()
      .then(setEntries)
      .catch((e) => os.notify("Storage error", String(e)));
  useEffect(() => {
    refresh();
    window.addEventListener("fakeos-files-changed", refresh);
    return () => window.removeEventListener("fakeos-files-changed", refresh);
  }, []);
  useEffect(() => {
    if (data)
      fs.all().then((all) => {
        const item = all.find((f) => f.id === data);
        if (item?.kind === "folder") setFolder(item.id);
        else if (item) setPreview(item);
      });
  }, [data]);
  const current = entries.find((f) => f.id === folder);
  const create = async (kind: Entry["kind"]) => {
    const name = prompt(
      "Name",
      kind === "folder" ? "New folder" : "Untitled.txt",
    );
    if (name) {
      await fs.create(name, folder, kind);
      refresh();
    }
  };
  const open = (f: Entry) => {
    if (f.mime === shortcutMime) {
      openEntry(f).catch((e) => os.notify("Shortcut unavailable", String(e)));
      return;
    }
    if (f.kind === "folder") {
      setFolder(f.id);
      select([]);
    } else if (f.mime.startsWith("audio")) os.open("Music", f.id);
    else if (
      f.mime.startsWith("image") ||
      f.mime.startsWith("video/") ||
      f.mime === "application/pdf"
    ) {
      setPreview(f);
    } else if (
      f.mime.startsWith("text/") ||
      f.mime === "application/fakeos-note" ||
      !f.mime
    )
      os.open("Editor", f.id);
    else
      os.notify(
        "Preview unavailable",
        "Use Download to open this file in a compatible application.",
      );
  };
  const action = async (type: string) => {
    for (const id of selected) {
      const f = entries.find((e) => e.id === id)!;
      if (type === "delete") {
        if (f.parent === "/") {
          os.notify("Protected location", "System folders cannot be deleted.");
          continue;
        }
        if (folder === "Trash") await fs.remove(id);
        else await fs.put({ ...f, parent: "Trash", originalParent: f.parent });
      }
      if (type === "restore")
        await fs.put({ ...f, parent: f.originalParent || "Documents" });
      if (type === "rename") {
        const name = prompt("New name", f.name);
        if (name) await fs.put({ ...f, name });
      }
      if (type === "shortcut") {
        await createShortcut(f.name, { fileId: f.id });
        os.notify("Shortcut created", "Find it on your desktop.");
      }
      if (type === "download") download(f.name, f.content);
      if (type === "copy") await fs.copy(f.id, f.parent, f.name + " copy");
      if (type === "move") {
        const path = prompt("Destination folder name", "Documents");
        const dest = entries.find(
          (e) => e.kind === "folder" && e.name === path,
        );
        if (dest && dest.id !== id) await fs.move(f.id, dest.id);
        else
          os.notify(
            "Move failed",
            "Choose an existing folder other than the selected folder.",
          );
      }
      if (type === "properties")
        alert(
          `${f.name}\n${f.kind} · ${f.mime}\n${new Blob([f.content]).size} bytes\nModified ${new Date(f.updated).toLocaleString()}`,
        );
    }
    refresh();
  };
  return (
    <div className="file-app">
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
      <aside>
        <h3>WORKSPACE</h3>
        {entries
          .filter((e) => e.parent === "/" && e.kind === "folder")
          .map((e) => (
            <button
              className={folder === e.id ? "selected" : ""}
              key={e.id}
              onClick={() => setFolder(e.id)}
            >
              ◇ {e.name}
            </button>
          ))}
        <button onClick={() => setFolder("/")}>All locations</button>
      </aside>
      <main>
        <div className="toolbar">
          <button onClick={() => setFolder(current?.parent || "/")}>↑</button>
          <strong>{current?.name || "Locations"}</strong>
          <input
            placeholder="Search files"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => setList(!list)}>
            {list ? "Grid" : "List"}
          </button>
        </div>
        <div className="toolbar wrap">
          <button
            onClick={() =>
              create("folder").catch((e) =>
                os.notify("Create failed", String(e)),
              )
            }
          >
            New folder
          </button>
          <button
            onClick={() =>
              create("file").catch((e) => os.notify("Create failed", String(e)))
            }
          >
            New file
          </button>
          <label className="button">
            Upload
            <input
              hidden
              type="file"
              multiple
              onChange={async (e) => {
                for (const file of Array.from(e.target.files || [])) {
                  const content = await new Promise<string>(
                    (resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      if (
                        file.type.startsWith("text") ||
                        file.name.endsWith(".txt")
                      )
                        reader.readAsText(file);
                      else reader.readAsDataURL(file);
                    },
                  );
                  await fs.create(
                    file.name,
                    folder === "/" ? "Downloads" : folder,
                    "file",
                    content,
                    file.type,
                  );
                }
                refresh();
              }}
            />
          </label>
          {[
            "rename",
            "shortcut",
            "copy",
            "move",
            "download",
            "properties",
            "delete",
            ...(folder === "Trash" ? ["restore"] : []),
          ].map((a) => (
            <button
              disabled={!selected.length}
              key={a}
              onClick={() =>
                action(a).catch((e) =>
                  os.notify("File operation failed", String(e)),
                )
              }
            >
              {a}
            </button>
          ))}
        </div>
        <div className={list ? "file-list" : "file-grid"}>
          {entries
            .filter(
              (e) =>
                e.parent === folder &&
                e.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((e) => (
              <button
                key={e.id}
                className={selected.includes(e.id) ? "file selected" : "file"}
                onClick={(event) =>
                  select(event.ctrlKey ? [...selected, e.id] : [e.id])
                }
                onDoubleClick={() => open(e)}
              >
                <span>{e.kind === "folder" ? "📁" : "📄"}</span>
                {e.name}
                <small>
                  {e.kind === "folder" ? "Folder" : e.mime || "File"}
                </small>
                <span
                  className="file-open"
                  onClick={(event) => {
                    event.stopPropagation();
                    open(e);
                  }}
                >
                  Open →
                </span>
              </button>
            ))}
        </div>
        <small>
          {selected.length} selected ·{" "}
          {entries.filter((e) => e.parent === folder).length} items · Stored in
          this browser
        </small>
      </main>
    </div>
  );
}
