import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Search, LayoutGrid, List, FolderOpen, FolderPlus, FilePlus, Upload, MoreHorizontal, HardDrive, Trash2, ExternalLink } from "lucide-react";
import { FileArtwork, fileKind, fileSize } from "./filePresentation";
import FilePreview from "./FilePreview";
import {
  createShortcut,
  openEntry,
  shortcutMime,
} from "../../services/shortcuts";
import { useEffect, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS } from "../../store";
import { download } from "../../utils/download";
import { makeZip, readZip } from "../../services/zip";
export default function Files({ data }: { data?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [navigation, setNavigation] = useState({ paths: ["/"], index: 0 }),
    [sort, setSort] = useState("name"),
    [search, setSearch] = useState(""),
    [selected, select] = useState<string[]>([]),
    [list, setList] = useState(false),
    [preview, setPreview] = useState<Entry | null>(null),
    [draggingFiles, setDraggingFiles] = useState(false);
  const os = useOS();
  const folder = navigation.paths[navigation.index];
  const setFolder = (id: string) => {
    setNavigation(n => n.paths[n.index] === id ? n : { paths: [...n.paths.slice(0, n.index + 1), id], index: n.index + 1 });
    select([]); setSearch("");
  };
  const travel = (step: number) => { setNavigation(n => ({ ...n, index: Math.max(0, Math.min(n.paths.length - 1, n.index + step)) })); select([]); setSearch(""); };

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
  const breadcrumbs: Entry[] = [];
  let ancestor = current;
  while (ancestor && !breadcrumbs.some(e => e.id === ancestor?.id)) { breadcrumbs.unshift(ancestor); ancestor = entries.find(e => e.id === ancestor?.parent); }
  const visible = entries.filter(e => e.parent === folder && e.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) =>
    a.kind !== b.kind ? (a.kind === "folder" ? -1 : 1) : sort === "recent" ? b.updated - a.updated : sort === "type" ? fileKind(a).localeCompare(fileKind(b)) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name, undefined, { numeric: true }));

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
      const f = entries.find((e) => e.id === id);
      if (!f) continue;
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
    select([]);
    refresh();
  };
  return (
    <div className={`file-app ${draggingFiles ? "file-drop-active" : ""}`} onDragOver={e => { e.preventDefault(); setDraggingFiles(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingFiles(false); }} onDrop={e => { e.preventDefault(); setDraggingFiles(false); importLocal(e.dataTransfer.files).catch(error => os.notify("Import failed", String(error))); }}>
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
      <aside>
        <div className="files-brand"><HardDrive size={22} /><div><b>My workspace</b><small>Saved locally</small></div></div>
        <h3>LOCATIONS</h3>
        {entries
          .filter((e) => e.parent === "/" && e.kind === "folder")
          .map((e) => (
            <button
              className={folder === e.id ? "selected" : ""}
              key={e.id}
              aria-label={e.name}
              title={e.name}
              onClick={() => setFolder(e.id)}
            >
              {e.id === "Trash" ? <Trash2 size={17} /> : <FolderOpen size={17} />}<span>{e.name}</span>
              {e.id === "Trash" && <small>{entries.filter(item => item.parent === "Trash").length}</small>}
            </button>
          ))}
        <button aria-label="All locations" title="All locations" onClick={() => setFolder("/")}><HardDrive size={17} /><span>All locations</span></button>
      </aside>
      <main>
        <div className="files-navigation">
          <div className="files-nav-buttons">
            <button aria-label="Back" disabled={navigation.index === 0} onClick={() => travel(-1)}><ArrowLeft size={17} /></button>
            <button aria-label="Forward" disabled={navigation.index === navigation.paths.length - 1} onClick={() => travel(1)}><ArrowRight size={17} /></button>
            <button aria-label="Parent folder" disabled={folder === "/"} onClick={() => setFolder(current?.parent || "/")}><ArrowUp size={17} /></button>
          </div>
          <nav className="files-breadcrumbs" aria-label="Folder path"><button onClick={() => setFolder("/")}><HardDrive size={16} /><span>Workspace</span></button>{breadcrumbs.map(e => <span key={e.id}><ChevronRight size={13} /><button onClick={() => setFolder(e.id)}>{e.name}</button></span>)}</nav>
        </div>
        <header className="files-heading"><div><small>{folder === "Trash" ? "RECYCLE & RESTORE" : "YOUR FILES, ORGANIZED"}</small><h2>{current?.name || "All locations"}</h2><p>{folder === "Trash" ? "Restore something you need, or clear space for a fresh start." : "A little space for everything you create."}</p></div></header>
        <div className="files-search-row"><label className="files-search"><Search size={16} /><input aria-label="Search files" placeholder="Search files" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Sort files" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name</option><option value="recent">Recently modified</option><option value="type">File type</option></select><button aria-label="Toggle file view" title={list ? "Grid view" : "List view"} aria-pressed={list} onClick={() => setList(!list)}>{list ? <LayoutGrid size={18} /> : <List size={18} />}</button></div>
        <div className="toolbar wrap files-actions">
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
            <FolderPlus size={16} /> New folder
          </button>
          <button
            onClick={() =>
              create("file").catch((e) => os.notify("Create failed", String(e)))
            }
          >
            <FilePlus size={16} /> New file
          </button>
          <label className="button">
            <Upload size={16} /> Import files / ZIP
            <input
              hidden
              type="file"
              multiple
              accept="*/*,.zip"
              onChange={async e => { try { if (e.target.files?.length) await importLocal(e.target.files); } catch (error) { os.notify("Import failed", String(error)); } e.target.value = ""; }}
            />
          </label>
          <button disabled={selected.length !== 1} onClick={() => { const entry = entries.find(e => e.id === selected[0]); if (entry) open(entry); }}><ExternalLink size={16} /> Open</button>
          <details className="files-more"><summary><MoreHorizontal size={18} /> Actions {selected.length > 0 && <small>({selected.length})</small>}</summary><div className="files-more-menu">
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
          </div></details>
        </div>
        {list && visible.length > 0 && <div className="files-list-heading"><span>Name</span><span>Modified</span><span>Size</span></div>}
        <div className={list ? "file-list" : "file-grid"}>
          {visible            .map((e) => (
              <button
                key={e.id}
                className={selected.includes(e.id) ? "file selected" : "file"}
                onClick={(event) =>
                  select(event.ctrlKey || event.metaKey ? selected.includes(e.id) ? selected.filter(id => id !== e.id) : [...selected, e.id] : [e.id])
                }
                title={e.name}
                aria-pressed={selected.includes(e.id)}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); open(e); } }}
                onDoubleClick={() => open(e)}
              >
                <FileArtwork entry={e} />
                <span className="file-caption"><b>{e.name}</b><small>{fileKind(e)}</small></span>
                {list && <><small className="file-date">{new Date(e.updated).toLocaleDateString()}</small><small className="file-size">{e.kind === "folder" ? "—" : fileSize(e)}</small></>}
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
        {!visible.length && <div className="files-empty"><FolderOpen size={42} /><h3>{search ? "No matching files" : folder === "Trash" ? "Trash is empty" : "Room for something new"}</h3><p>{search ? "Try a different name or clear your search." : folder === "Trash" ? "Deleted files will appear here until you empty it." : "Create a file or drop something here to import it."}</p>{search && <button onClick={() => setSearch("")}>Clear search</button>}</div>}
        <footer className="files-status"><span>
          {selected.length} selected ·{" "}
          {entries.filter((e) => e.parent === folder).length} items · Stored in
          this browser
        </span><span><HardDrive size={13} /> Local storage</span></footer>
        {draggingFiles && <div className="file-drop-overlay">Drop files or a ZIP to import them</div>}
      </main>
    </div>
  );
}
