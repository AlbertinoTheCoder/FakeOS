import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { fs } from "./filesystem";
import { importWorkspace, validateBackup, type Backup } from "./backup";
import { createShortcut, shortcutMime } from "./shortcuts";
it("imports without overwriting existing files and remaps nested folders", async () => {
  await fs.init();
  const folder = await fs.create("Backup test", "Documents", "folder");
  const file = await fs.create("keep.txt", folder.id, "file", "original");
  await createShortcut("Backup file shortcut", { fileId: file.id });
  const backup: Backup = {
    format: "fakeos-workspace",
    version: 1,
    created: new Date().toISOString(),
    files: await fs.all(),
    preferences: {},
  };
  await importWorkspace(backup);
  const all = await fs.all();
  expect(all.find((f) => f.id === file.id)?.content).toBe("original");
  const imported = all.find((f) => f.name === "Backup test (imported 1)")!;
  expect(all.find((f) => f.parent === imported.id)?.content).toBe("original");
  const importedFile = all.find((f) => f.parent === imported.id)!;
  const importedShortcut = all.find(
    (f) =>
      f.mime === shortcutMime && f.name === "Backup file shortcut (imported 1)",
  )!;
  expect(JSON.parse(importedShortcut.content).fileId).toBe(importedFile.id);
});
it("rejects malformed backups before writing anything", () => {
  expect(() => validateBackup({ format: "wrong" })).toThrow();
});
it("rejects cyclic folders and unsafe preferences without modifying files", async () => {
  const files = await fs.all();
  const base: Backup = {
    format: "fakeos-workspace",
    version: 1,
    created: new Date().toISOString(),
    files,
    preferences: {},
  };
  await expect(
    importWorkspace({
      ...base,
      files: files.map((f) =>
        f.id === "Documents" ? { ...f, parent: "Documents" } : f,
      ),
    }),
  ).rejects.toThrow("cycle");
  await expect(
    importWorkspace({
      ...base,
      preferences: {
        "fakeos-clock": JSON.stringify({ state: { alarms: "invalid" } }),
      },
    }),
  ).rejects.toThrow("preferences");
  expect(await fs.all()).toEqual(files);
});
