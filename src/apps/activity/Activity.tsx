import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Activity() {
  const { windows, close } = useOS();
  const [usage, setUsage] = useState(0);
  useEffect(() => {
    navigator.storage?.estimate().then((e) => setUsage(e.usage || 0));
  }, []);
  return (
    <div className="settings">
      <h1>Activity monitor</h1>
      <p>
        {windows.length} running windows · {(usage / 1024 / 1024).toFixed(2)} MB
        browser storage
      </p>
      <p>
        CPU and system RAM measurements are unavailable. This view shows FakeOS
        application state.
      </p>
      {windows.map((w) => (
        <section key={w.id} className="toolbar">
          <strong>{w.app}</strong>
          <span>{w.minimized ? "Minimized" : "Running"}</span>
          <button onClick={() => close(w.id)}>End task</button>
        </section>
      ))}
    </div>
  );
}
