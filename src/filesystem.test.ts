import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { fs } from "./services/filesystem";
describe("shared filesystem", () => {
  it("initializes once and persists edits and trash restoration", async () => {
    await fs.init();
    const count = (await fs.all()).length;
    await fs.init();
    expect((await fs.all()).length).toBe(count);
    const file = await fs.create(
      "Persistence.txt",
      "Documents",
      "file",
      "hello",
    );
    await fs.put({
      ...file,
      content: "saved",
      parent: "Trash",
      originalParent: "Documents",
    });
    let saved = (await fs.all()).find((e) => e.id === file.id)!;
    expect(saved.content).toBe("saved");
    expect(saved.parent).toBe("Trash");
    await fs.put({ ...saved, parent: saved.originalParent! });
    saved = (await fs.all()).find((e) => e.id === file.id)!;
    expect(saved.parent).toBe("Documents");
    await fs.remove(file.id);
    expect((await fs.all()).find((e) => e.id === file.id)).toBeUndefined();
  });
});
it("copies nested folders, rejects cycles, and recursively deletes", async () => {
  const parent = await fs.create("Project", "Documents", "folder");
  const child = await fs.create("Nested", parent.id, "folder");
  await fs.create("data.txt", child.id, "file", "retained");
  await expect(fs.move(parent.id, child.id)).rejects.toThrow("itself");
  const copy = await fs.copy(parent.id, "Downloads");
  const all = await fs.all();
  const nested = all.find((e) => e.parent === copy.id)!;
  expect(all.find((e) => e.parent === nested.id)?.content).toBe("retained");
  await fs.remove(parent.id);
  expect(
    (await fs.all()).some(
      (e) => e.parent === parent.id || e.parent === child.id,
    ),
  ).toBe(false);
  expect((await fs.all()).find((e) => e.id === copy.id)).toBeDefined();
});
