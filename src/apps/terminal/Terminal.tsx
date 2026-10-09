import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
import { terminalHelp } from "./help";
export default function Terminal() {
  const [lines, setLines] = useState([
      "FakeOS shell 1.0 — browser sandbox",
      "Type help to explore.",
    ]),
    [input, setInput] = useState(""),
    [cwd, setCwd] = useState("/"),
    [history, setHistory] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false);
  const running = useRef(false);
  const commandInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!busy && commandInput.current?.offsetParent)
      commandInput.current.focus();
  }, [busy]);
  const username = useOS((s) => s.prefs.username);
  const run = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const command = input;
    setInput("");
    setHistory([...history, command]);
    setIndex(history.length + 1);
    const [cmd, ...args] = command.trim().split(/\s+/);
    let all: Entry[];
    try {
      all = await fs.all();
    } catch (error) {
      setLines((prev) => [...prev, String(error)]);
      running.current = false;
      setBusy(false);
      return;
    }
    const resolve = (path: string) => {
      let parent = path.startsWith("/") ? "/" : cwd;
      for (const part of path.split("/").filter(Boolean)) {
        if (part === "..") {
          parent = all.find((e) => e.id === parent)?.parent || "/";
          continue;
        }
        if (part === ".") continue;
        const entry = all.find((e) => e.parent === parent && e.name === part);
        if (!entry) return undefined;
        parent = entry.id;
      }
      return all.find((e) => e.id === parent);
    };
    let output = "";
    try {
      switch (cmd) {
        case "help":
          output = terminalHelp(args[0]);
          break;
        case "clear":
          setLines([]);
          running.current = false;
          setBusy(false);
          return;
        case "ls":
          output = all
            .filter((e) => e.parent === (args[0] ? resolve(args[0])?.id : cwd))
            .map((e) => e.name + (e.kind === "folder" ? "/" : ""))
            .join("  ");
          break;
        case "pwd": {
          let p = cwd;
          const names = [];
          while (p !== "/") {
            const e = all.find((e) => e.id === p);
            if (!e) break;
            names.unshift(e.name);
            p = e.parent;
          }
          output = "/" + names.join("/");
          break;
        }
        case "cd":
          if (!args[0] || args[0] === "/") setCwd("/");
          else {
            const f = resolve(args[0]);
            if (!f || f.kind !== "folder") throw Error("Folder not found");
            setCwd(f.id);
          }
          break;
        case "mkdir":
        case "touch":
          if (!args[0]) throw Error("Name required");
          await fs.create(args[0], cwd, cmd === "mkdir" ? "folder" : "file");
          break;
        case "cat": {
          const f = resolve(args[0]);
          if (!f) throw Error("File not found");
          output = f.content;
          break;
        }
        case "echo": {
          const pos = args.indexOf(">");
          if (pos >= 0) {
            const name = args[pos + 1];
            if (!name) throw Error("Filename required");
            const f = resolve(name);
            if (f)
              await fs.put({ ...f, content: args.slice(0, pos).join(" ") });
            else
              await fs.create(name, cwd, "file", args.slice(0, pos).join(" "));
          } else output = args.join(" ");
          break;
        }
        case "rm": {
          const f = resolve(args[0]);
          if (!f) throw Error("File not found");
          if (f.parent === "/")
            throw Error("System folders cannot be moved to Trash.");
          await fs.put({ ...f, parent: "Trash", originalParent: f.parent });
          break;
        }
        case "cp":
        case "mv": {
          const f = resolve(args[0]);
          if (!f || !args[1]) throw Error("Source and destination required");
          const dest = resolve(args[1]);
          if (cmd === "cp")
            await fs.create(
              dest?.kind === "folder" ? f.name : args[1],
              dest?.kind === "folder" ? dest.id : cwd,
              f.kind,
              f.content,
              f.mime,
            );
          else
            await fs.put({
              ...f,
              parent: dest?.kind === "folder" ? dest.id : cwd,
              name: dest?.kind === "folder" ? f.name : args[1],
            });
          break;
        }
        case "date":
          output = new Date().toString();
          break;
        case "whoami":
          output = username;
          break;
        case "history":
          output = history.join("\n");
          break;
        case "neofetch":
          output = `✦ FakeOS\nUser: ${username}\nRuntime: Web browser\nStorage: IndexedDB\nShell: simulated (no host access)`;
          break;
        case "":
          break;
        default:
          throw Error(`${cmd}: command not found`);
      }
    } catch (e) {
      output = String(e);
    }
    running.current = false;
    setBusy(false);
    setLines((prev) => [
      ...prev,
      `${username}@fakeos:${cwd}$ ${command}`,
      output,
    ]);
  };
  return (
    <div className="terminal">
      <pre>{lines.join("\n")}</pre>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <span>
          {username}@fakeos:{cwd}$
        </span>
        <input
          ref={commandInput}
          disabled={busy}
          autoFocus
          aria-label="Terminal command"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const n = Math.max(0, index - 1);
              setIndex(n);
              setInput(history[n] || "");
            }
            if (e.key === "ArrowDown") {
              const n = Math.min(history.length, index + 1);
              setIndex(n);
              setInput(history[n] || "");
            }
            if (e.key === "Tab") {
              e.preventDefault();
              fs.all().then((all) => {
                const last = input.split(" ").at(-1) || "";
                const match = all.find(
                  (f) => f.parent === cwd && f.name.startsWith(last),
                );
                if (match)
                  setInput(
                    input.slice(0, input.length - last.length) + match.name,
                  );
              });
            }
          }}
        />
      </form>
    </div>
  );
}
