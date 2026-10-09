import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Notes() {
  const [notes, setNotes] = useState<Entry[]>([]),
    [active, setActive] = useState(""),
    [query, setQuery] = useState("");
  const load = () =>
    fs
      .all()
      .then((a) =>
        setNotes(a.filter((e) => e.mime === "application/fakeos-note")),
      );
  useEffect(() => {
    load();
    window.addEventListener("fakeos-files-changed", load);
    return () => window.removeEventListener("fakeos-files-changed", load);
  }, []);
  const note = notes.find((n) => n.id === active);
  return (
    <div className="notes file-app">
      <aside>
        <h2>Notes</h2>
        <input
          placeholder="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={async () => {
            const n = await fs.create(
              "New note",
              "Documents",
              "file",
              "",
              "application/fakeos-note",
            );
            await load();
            setActive(n.id);
          }}
        >
          + New note
        </button>
        {notes
          .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
          .map((n) => (
            <button
              key={n.id}
              className={active === n.id ? "selected" : ""}
              onClick={() => setActive(n.id)}
            >
              {n.pinned ? "★ " : ""}
              {n.name}
            </button>
          ))}
      </aside>
      <main>
        {note ? (
          <>
            <div className="toolbar">
              <input
                aria-label="Note title"
                value={note.name}
                onChange={(e) => {
                  const n = { ...note, name: e.target.value };
                  setNotes(notes.map((x) => (x.id === n.id ? n : x)));
                  void fs.put(n);
                }}
              />
              <button
                onClick={async () => {
                  await fs.put({ ...note, pinned: !note.pinned });
                  load();
                }}
              >
                {note.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={async () => {
                  await fs.put({
                    ...note,
                    parent: "Trash",
                    originalParent: "Documents",
                    mime: "text/plain",
                  });
                  load();
                  setActive("");
                }}
              >
                Delete
              </button>
            </div>
            <textarea
              aria-label="Note content"
              value={note.content}
              onChange={(e) => {
                const n = {
                  ...note,
                  content: e.target.value,
                  updated: Date.now(),
                };
                setNotes(notes.map((x) => (x.id === n.id ? n : x)));
                void fs.put(n);
              }}
            />
            <small>Saved automatically in your filesystem</small>
          </>
        ) : (
          <div className="empty">
            Your thoughts, a little more organized.
            <br />
            Create or select a note.
          </div>
        )}
      </main>
    </div>
  );
}
