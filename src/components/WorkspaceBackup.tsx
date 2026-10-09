import { useState } from "react";
import {
  exportWorkspace,
  importWorkspace,
  preferenceKeys,
} from "../services/backup";
import { useOS } from "../store";
import { useClock } from "../apps/clock/clockStore";
import { download } from "../utils/download";
export default function WorkspaceBackup() {
  const [busy, setBusy] = useState(false),
    [restore, setRestore] = useState(false),
    [status, setStatus] = useState("");
  const notify = useOS((s) => s.notify);
  return (
    <section>
      <h3>Workspace backup</h3>
      <p>
        Download your files and preferences to your computer. Import adds copies
        and keeps your existing files. Your lock PIN is excluded.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const backup = await exportWorkspace();
            download(
              `FakeOS-backup-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(backup),
            );
            setStatus(`Exported ${backup.files.length} files and folders.`);
          } catch (e) {
            setStatus(String(e));
            notify("Backup failed", String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Download workspace backup
      </button>
      <label>
        Restore preferences too
        <input
          type="checkbox"
          checked={restore}
          onChange={(e) => setRestore(e.target.checked)}
        />
      </label>
      <label className="button">
        Import workspace backup
        <input
          aria-label="Import workspace backup"
          disabled={busy}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              if (file.size > 100 * 1024 * 1024)
                throw Error("Choose a backup smaller than 100 MB.");
              if (
                restore &&
                useOS.getState().windows.some((w) => w.dirty) &&
                !confirm(
                  "Restoring preferences can switch interfaces. Save your open work first, or continue and discard unsaved app state.",
                )
              )
                return;
              const result = await importWorkspace(
                JSON.parse(await file.text()),
              );
              if (restore) {
                for (const key of preferenceKeys)
                  if (result.preferences[key]) {
                    let value = result.preferences[key];
                    if (key === "fakeos-preferences") {
                      const parsed = JSON.parse(value);
                      if (parsed.state?.prefs) delete parsed.state.prefs.pin;
                      value = JSON.stringify(parsed);
                    }
                    localStorage.setItem(key, value);
                  }
                await useOS.persist.rehydrate();
                await useClock.persist.rehydrate();
                window.dispatchEvent(new Event("fakeos-layout-restored"));
              }
              setStatus(
                `Imported ${result.count} files and folders. Existing files were kept.`,
              );
              notify(
                "Backup imported",
                `${result.count} files and folders added.`,
              );
            } catch (e) {
              setStatus(String(e));
              notify("Import failed", String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <p role="status">{busy ? "Working…" : status}</p>
    </section>
  );
}
