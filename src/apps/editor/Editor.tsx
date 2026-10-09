import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Editor({
  data,
  instanceId,
}: {
  data?: string;
  instanceId?: string;
}) {
  const [text, setText] = useState(""),
    [name, setName] = useState("Untitled.txt"),
    [id, setId] = useState(data),
    [dirty, setDirty] = useState(false);
  const notify = useOS((s) => s.notify);
  useEffect(() => {
    if (instanceId) useOS.getState().update(instanceId, { dirty });
  }, [dirty, instanceId]);
  useEffect(() => {
    if (data)
      fs.all().then((all) => {
        const f = all.find((e) => e.id === data);
        if (f) {
          setText(f.content);
          setName(f.name);
        }
      });
  }, [data]);
  const save = async (as = false) => {
    try {
      const title = as ? prompt("Save as", name) : name;
      if (!title) return;
      if (id && !as) {
        const f = (await fs.all()).find((e) => e.id === id);
        if (f) await fs.put({ ...f, content: text, updated: Date.now() });
      } else {
        const f = await fs.create(title, "Documents", "file", text);
        setId(f.id);
        setName(title);
      }
      setDirty(false);
      notify("Document saved", title);
    } catch (e) {
      notify("Save failed", String(e));
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "s" &&
        useOS.getState().active === instanceId
      ) {
        e.preventDefault();
        save();
      }
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", unload);
    };
  }, [text, dirty, id, name]);
  return (
    <div className="editor app-column">
      <div className="toolbar">
        <strong>
          {name}
          {dirty ? " •" : ""}
        </strong>
        <button onClick={() => save()}>Save</button>
        <button onClick={() => save(true)}>Save as</button>
        <button onClick={() => download(name, text)}>Export</button>
      </div>
      <textarea
        aria-label="Document text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        placeholder="A fresh page. Make something great."
      />
      <footer>
        {text.length} characters ·{" "}
        {text.trim() ? text.trim().split(/\s+/).length : 0} words ·{" "}
        {dirty ? "Unsaved changes" : "Saved"}
      </footer>
    </div>
  );
}
