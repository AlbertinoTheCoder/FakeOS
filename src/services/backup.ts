import { fs, type Entry } from "./filesystem";
import { shortcutMime } from "./shortcuts";
import { apps } from "../store";
import { nextAlarm } from "../apps/clock/clockStore";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
function validPreferences(key: string, value: unknown) {
  if (key === "fakeos-bookmarks")
    return (
      Array.isArray(value) &&
      value.every((v) => typeof v === "string" && /^https?:\/\//.test(v))
    );
  if (key === "fakeos-desktop-positions")
    return (
      record(value) &&
      Object.values(value).every(
        (v) =>
          record(v) &&
          typeof v.x === "number" &&
          Number.isFinite(v.x) &&
          typeof v.y === "number" &&
          Number.isFinite(v.y),
      )
    );
  if (key === "fakeos-mobile-layout")
    return (
      record(value) &&
      Array.isArray(value.order) &&
      value.order.every((v) => apps.includes(v)) &&
      Array.isArray(value.folders) &&
      value.folders.every(
        (v) =>
          record(v) &&
          typeof v.id === "string" &&
          typeof v.name === "string" &&
          Array.isArray(v.apps) &&
          v.apps.every((a) => apps.includes(a)),
      )
    );
  if (!record(value) || !record(value.state)) return false;
  const state = value.state;
  if (key === "fakeos-preferences")
    return (
      record(state.prefs) &&
      Object.values(state.prefs).every((v) =>
        ["string", "boolean", "number"].includes(typeof v),
      ) &&
      (!state.pinned ||
        (Array.isArray(state.pinned) &&
          state.pinned.every((a) => apps.includes(a))))
    );
  if (key === "fakeos-clock") {
    if (
      !Array.isArray(state.alarms) ||
      !record(state.timer) ||
      !record(state.stopwatch)
    )
      return false;
    const t = state.timer,
      s = state.stopwatch;
    return (
      state.alarms.every((a) => {
        if (
          !record(a) ||
          typeof a.id !== "string" ||
          typeof a.time !== "string" ||
          typeof a.label !== "string" ||
          typeof a.enabled !== "boolean" ||
          !nonnegative(a.nextAt)
        )
          return false;
        try {
          nextAlarm(a.time);
          return true;
        } catch {
          return false;
        }
      }) &&
      (t.deadline === null || nonnegative(t.deadline)) &&
      nonnegative(t.remaining) &&
      (s.startedAt === null || nonnegative(s.startedAt)) &&
      nonnegative(s.elapsed) &&
      Array.isArray(s.laps) &&
      s.laps.every(nonnegative)
    );
  }
  return false;
}
const roots = [
  "Desktop",
  "Documents",
  "Downloads",
  "Pictures",
  "Music",
  "Videos",
  "Trash",
];
export const preferenceKeys = [
  "fakeos-preferences",
  "fakeos-mobile-layout",
  "fakeos-desktop-positions",
  "fakeos-bookmarks",
  "fakeos-browser-mode-v2",
  "fakeos-clock",
];
export interface Backup {
  format: "fakeos-workspace";
  version: 1;
  created: string;
  files: Entry[];
  preferences: Record<string, string>;
}
export async function exportWorkspace(): Promise<Backup> {
  const preferences: Record<string, string> = {};
  for (const key of preferenceKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      if (key === "fakeos-preferences") {
        const parsed = JSON.parse(value);
        if (parsed.state?.prefs) delete parsed.state.prefs.pin;
        preferences[key] = JSON.stringify(parsed);
      } else preferences[key] = value;
    }
  }
  return {
    format: "fakeos-workspace",
    version: 1,
    created: new Date().toISOString(),
    files: await fs.all(),
    preferences,
  };
}
export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== "object")
    throw Error("Choose a FakeOS workspace backup.");
  const backup = value as Backup;
  if (
    backup.format !== "fakeos-workspace" ||
    backup.version !== 1 ||
    !Array.isArray(backup.files) ||
    typeof backup.preferences !== "object" ||
    !backup.preferences
  )
    throw Error("Invalid or unsupported backup format.");
  if (backup.files.length > 20000)
    throw Error("Too many files in this backup.");
  const ids = new Set<string>();
  for (const f of backup.files) {
    if (
      !f ||
      typeof f.id !== "string" ||
      !f.id ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      f.name.includes("/") ||
      typeof f.parent !== "string" ||
      !["file", "folder"].includes(f.kind) ||
      typeof f.content !== "string" ||
      typeof f.mime !== "string" ||
      !Number.isFinite(f.updated)
    )
      throw Error("Backup contains invalid or duplicate files.");
    ids.add(f.id);
  }
  const entries = new Map(backup.files.map((f) => [f.id, f]));
  for (const f of backup.files) {
    let parent = f.parent;
    const visited = new Set([f.id]);
    while (parent !== "/") {
      if (visited.has(parent)) throw Error("Backup contains a folder cycle.");
      visited.add(parent);
      const folder = entries.get(parent);
      if (!folder || folder.kind !== "folder")
        throw Error("Backup contains a missing parent folder.");
      parent = folder.parent;
    }
  }
  for (const root of roots)
    if (
      !backup.files.some(
        (f) => f.id === root && f.parent === "/" && f.kind === "folder",
      )
    )
      throw Error("Backup is missing system folders.");
  for (const [key, setting] of Object.entries(backup.preferences)) {
    if (!preferenceKeys.includes(key) || typeof setting !== "string")
      throw Error("Backup contains unsupported preferences.");
    if (key !== "fakeos-browser-mode-v2") {
      const parsed: unknown = JSON.parse(setting);
      if (!validPreferences(key, parsed))
        throw Error(`Invalid ${key} preferences.`);
    } else if (!["external", "embedded"].includes(setting))
      throw Error("Invalid browser mode.");
  }
  return backup;
}
export async function importWorkspace(value: unknown) {
  const backup = validateBackup(value);
  await fs.init();
  const mapping = new Map(
    backup.files.map((f) => [
      f.id,
      roots.includes(f.id) && f.parent === "/" ? f.id : crypto.randomUUID(),
    ]),
  );
  const existing = await fs.all();
  const used = new Set(existing.map((f) => `${f.parent}/${f.name}`));
  const files = backup.files
    .filter((f) => !(roots.includes(f.id) && f.parent === "/"))
    .map((f) => {
      const parent = f.parent === "/" ? "/" : mapping.get(f.parent)!;
      let name = f.name;
      let number = 1;
      const dot = f.kind === "file" ? f.name.lastIndexOf(".") : -1;
      const stem = dot > 0 ? f.name.slice(0, dot) : f.name,
        extension = dot > 0 ? f.name.slice(dot) : "";
      while (used.has(`${parent}/${name}`))
        name = `${stem} (imported ${number++})${extension}`;
      used.add(`${parent}/${name}`);
      let content = f.content;
      if (f.mime === shortcutMime) {
        const shortcut = JSON.parse(content);
        if (shortcut.fileId)
          shortcut.fileId = mapping.get(shortcut.fileId) || shortcut.fileId;
        content = JSON.stringify(shortcut);
      }
      return {
        ...f,
        id: mapping.get(f.id)!,
        parent,
        name,
        content,
        ...(f.originalParent
          ? { originalParent: mapping.get(f.originalParent) || "Documents" }
          : {}),
      };
    });
  await fs.importFiles(files);
  const preferences = { ...backup.preferences };
  if (preferences["fakeos-desktop-positions"]) {
    const positions = JSON.parse(preferences["fakeos-desktop-positions"]);
    preferences["fakeos-desktop-positions"] = JSON.stringify(
      Object.fromEntries(
        Object.entries(positions).map(([id, position]) => [
          mapping.get(id) || id,
          position,
        ]),
      ),
    );
  }
  return { count: files.length, preferences };
}
