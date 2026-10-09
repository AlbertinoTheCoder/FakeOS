import { openDB } from "idb";
export interface Entry {
  id: string;
  name: string;
  parent: string;
  kind: "file" | "folder";
  content: string;
  mime: string;
  updated: number;
  originalParent?: string;
  pinned?: boolean;
}
const database = openDB("fakeos", 1, {
  upgrade(db) {
    db.createObjectStore("files", { keyPath: "id" });
  },
});
let initialization: Promise<void> | undefined;
export const fs = {
  async all(): Promise<Entry[]> {
    return (await database).getAll("files");
  },
  async put(entry: Entry) {
    await (await database).put("files", entry);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("fakeos-files-changed"));
  },
  async importFiles(entries: Entry[]) {
    const tx = (await database).transaction("files", "readwrite");
    for (const entry of entries) await tx.store.put(entry);
    await tx.done;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("fakeos-files-changed"));
  },
  async remove(id: string) {
    const all = await this.all();
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of all)
        if (ids.has(e.parent) && !ids.has(e.id)) {
          ids.add(e.id);
          changed = true;
        }
    }
    const tx = (await database).transaction("files", "readwrite");
    for (const child of ids) await tx.store.delete(child);
    await tx.done;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("fakeos-files-changed"));
  },
  async move(id: string, parent: string) {
    const all = await this.all();
    const entry = all.find((e) => e.id === id);
    if (!entry) throw Error("File not found");
    let ancestor = parent;
    const seen = new Set<string>();
    while (ancestor !== "/") {
      if (ancestor === id || seen.has(ancestor))
        throw Error("Cannot move a folder into itself");
      seen.add(ancestor);
      const folder = all.find((e) => e.id === ancestor);
      if (!folder || folder.kind !== "folder")
        throw Error("Destination folder not found");
      ancestor = folder.parent;
    }
    await this.put({ ...entry, parent, updated: Date.now() });
  },
  async copy(id: string, parent: string, name?: string) {
    const all = await this.all();
    const source = all.find((e) => e.id === id);
    if (!source) throw Error("File not found");
    const clone = async (
      entry: Entry,
      destination: string,
      title = entry.name,
    ): Promise<Entry> => {
      const result = await this.create(
        title,
        destination,
        entry.kind,
        entry.content,
        entry.mime,
      );
      for (const child of all.filter((e) => e.parent === entry.id))
        await clone(child, result.id);
      return result;
    };
    return clone(source, parent, name);
  },
  async create(
    name: string,
    parent: string,
    kind: Entry["kind"] = "file",
    content = "",
    mime = "text/plain",
  ) {
    if (!name.trim() || name.includes("/"))
      throw Error("Use a nonempty name without slashes");
    const entry: Entry = {
      id: crypto.randomUUID(),
      name,
      parent,
      kind,
      content,
      mime,
      updated: Date.now(),
    };
    await this.put(entry);
    return entry;
  },
  async init() {
    if (initialization) return initialization;
    initialization = (async () => {
      if (!(await this.all()).length) {
        for (const name of [
          "Desktop",
          "Documents",
          "Downloads",
          "Pictures",
          "Music",
          "Videos",
          "Trash",
        ])
          await this.put({
            id: name,
            name,
            parent: "/",
            kind: "folder",
            content: "",
            mime: "",
            updated: Date.now(),
          });
        await this.create(
          "Welcome.txt",
          "Documents",
          "file",
          "Welcome to FakeOS. Your files stay in this browser. Try editing this document, drawing a picture, or exploring the terminal.",
        );
      }
    })();
    return initialization;
  },
};
