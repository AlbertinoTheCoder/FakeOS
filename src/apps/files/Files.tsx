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
import { makeZip, readZip } from "../../services/zip";
export default function Files({ data }: { data?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [folder, setFolder] = useState("/"),
    [search, setSearch] = useState(""),
    [selected, select] = useState<string[]>([]),
    [list, setList] = useState(false),
    [preview, setPreview] = useState<Entry | null>(null),
    [draggingFiles, setDraggingFiles] = useState(false);
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
  const importLocal = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const unpacked = await readZip(file, folder === "/" ? "Downloads" : folder);
        await fs.importFiles(unpacked);
      } else {
        const content = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")
          ? await file.text()
          : await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
        await fs.create(file.name, folder === "/" ? "Downloads" : folder, "file", content, file.type || "application/octet-stream");
      }
    }
    refresh();
    os.notify("Import complete", `${files.length} item${files.length === 1 ? "" : "s"} added to Files.`);
  };
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
        await fs.put({
          ...f,
          parent: entries.some(e => e.id === f.originalParent && e.kind === "folder" && e.parent !== "Trash") ? f.originalParent! : "Documents",
          originalParent: undefined,
          updated: Date.now(),
        });
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
    <div className={`file-app ${draggingFiles ? "file-drop-active" : ""}`} onDragOver={e => { e.preventDefault(); setDraggingFiles(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingFiles(false); }} onDrop={e => { e.preventDefault(); setDraggingFiles(false); importLocal(e.dataTransfer.files).catch(error => os.notify("Import failed", String(error))); }}>
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
          {folder === "Trash" && <button disabled={!entries.some(e => e.parent === "Trash")} onClick={async () => {
            const items = entries.filter(e => e.parent === "Trash");
            if (!items.length || !confirm(`Permanently delete ${items.length} item${items.length === 1 ? "" : "s"} in Trash? This cannot be undone.`)) return;
            try { for (const entry of items) await fs.remove(entry.id); select([]); refresh(); os.notify("Trash emptied", `${items.length} item${items.length === 1 ? "" : "s"} permanently deleted.`); }
            catch (error) { os.notify("Could not empty Trash", String(error)); }
          }}>Empty Trash</button>}
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
            Import files / ZIP
            <input
              hidden
              type="file"
              multiple
              accept="*/*,.zip"
              onChange={async e => { try { if (e.target.files?.length) await importLocal(e.target.files); } catch (error) { os.notify("Import failed", String(error)); } e.target.value = ""; }}
            />
          </label>
          <button disabled={!selected.length} onClick={() => {
            const result: Entry[] = [];
            const visit = (id: string, path = "") => { for (const entry of entries.filter(e => e.parent === id)) { const name = path ? `${path}/${entry.name}` : entry.name; if (entry.kind === "file") result.push({ ...entry, name }); else visit(entry.id, name); } };
            for (const id of selected) { const entry = entries.find(e => e.id === id); if (entry?.kind === "file") result.push(entry); else if (entry?.kind === "folder") visit(entry.id, entry.name); }
            if (!result.length) { os.notify("Nothing to export", "Select a folder or file with content first."); return; }
            const blob = makeZip(result), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${entries.find(e => selected.includes(e.id))?.name || "FakeOS files"}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}>Download ZIP</button>
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
        {draggingFiles && <div className="file-drop-overlay">Drop files or a ZIP to import them</div>}
      </main>
    </div>
  );
}
