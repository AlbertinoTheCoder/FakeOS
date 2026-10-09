import { apps, type AppId, useOS } from "../store";
import { fs, type Entry } from "./filesystem";
export interface Shortcut {
  app?: AppId;
  fileId?: string;
}
export const shortcutMime = "application/fakeos-shortcut";
export async function createShortcut(name: string, target: Shortcut) {
  if (!target.app && !target.fileId) throw Error("Choose an app or file.");
  return fs.create(
    name,
    "Desktop",
    "file",
    JSON.stringify(target),
    shortcutMime,
  );
}
export async function openEntry(entry: Entry) {
  const os = useOS.getState();
  if (entry.mime === shortcutMime) {
    const target = JSON.parse(entry.content) as Shortcut;
    if (target.app && apps.includes(target.app)) {
      os.open(target.app);
      return;
    }
    if (target.fileId) {
      const file = (await fs.all()).find((f) => f.id === target.fileId);
      if (file && file.parent !== "Trash" && file.mime !== shortcutMime) {
        await openEntry(file);
        return;
      }
    }
    throw Error("This shortcut target is missing or in Trash.");
  }
  if (entry.kind === "folder") os.open("Files", entry.id);
  else if (entry.mime.startsWith("image/")) os.open("Paint", entry.id);
  else if (entry.mime.startsWith("audio/")) os.open("Music", entry.id);
  else if (entry.mime === "application/pdf" || entry.mime.startsWith("video/"))
    os.open("Files", entry.id);
  else os.open("Editor", entry.id);
}
