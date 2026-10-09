import { newTab, navigateTab, stepTab, type BrowserTab } from "./navigation";
import { useState } from "react";
import { useOS } from "../../store";
import EmbeddedPage from "./EmbeddedPage";
export default function Browser() {
  const [external, setExternal] = useState(() => {
    try {
      return localStorage.getItem("fakeos-browser-mode-v2") !== "embedded";
    } catch {
      return true;
    }
  });
  const [tabs, setTabs] = useState<BrowserTab[]>([newTab()]),
    [tab, setTab] = useState(0),
    [address, setAddress] = useState(""),
    [bookmarks, setBookmarks] = useState<string[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("fakeos-bookmarks") || "[]");
      } catch {
        return [];
      }
    }),
    [key, setKey] = useState(0);
  const navigate = (value: string) => {
    try {
      const next = navigateTab(tabs[tab], value);
      setTabs(tabs.map((t, i) => (i === tab ? next : t)));
      setAddress(next.history[next.position]);
      if (external)
        window.open(
          next.history[next.position],
          "_blank",
          "noopener,noreferrer",
        );
    } catch {
      useOS.getState().notify("Invalid address", "Enter a valid web address.");
    }
  };
  const current = tabs[tab];
  const history = current.history,
    position = current.position;
  const url = history[position] || "";
  const step = (direction: number) => {
    const next = stepTab(current, direction);
    setTabs(tabs.map((t, i) => (i === tab ? next : t)));
    setAddress(next.history[next.position] || "");
    if (external && next.history[next.position])
      window.open(next.history[next.position], "_blank", "noopener,noreferrer");
  };
  return (
    <div className="app-column browser">
      <div className="toolbar wrap">
        {tabs.map((t, i) => (
          <button
            key={i}
            className={i === tab ? "selected" : ""}
            onClick={() => {
              setTab(i);
              setAddress(t.history[t.position] || "");
            }}
          >
            {t.history[t.position]
              ? new URL(t.history[t.position]).hostname
              : "New tab"}{" "}
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (tabs.length > 1) {
                  setTabs(tabs.filter((_, j) => j !== i));
                  setTab(0);
                  const next = tabs.filter((_, j) => j !== i)[0];
                  setAddress(next.history[next.position] || "");
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            setTabs([...tabs, newTab()]);
            setTab(tabs.length);
            setAddress("");
          }}
        >
          +
        </button>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(address);
        }}
      >
        <button
          type="button"
          disabled={position < 1}
          onClick={() => {
            step(-1);
          }}
        >
          ←
        </button>
        <button
          type="button"
          disabled={position >= history.length - 1}
          onClick={() => {
            step(1);
          }}
        >
          →
        </button>
        <button
          type="button"
          onClick={() => {
            if (external && url)
              window.open(url, "_blank", "noopener,noreferrer");
            else setKey(key + 1);
          }}
        >
          ↻
        </button>
        <input
          aria-label="Website address"
          placeholder="Enter a website address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <label
          className="browser-mode"
          title="Use regular browser tabs for sites that cannot open inside FakeOS"
        >
          <input
            aria-label="Use regular browser tabs"
            type="checkbox"
            checked={external}
            onChange={(e) => {
              setExternal(e.target.checked);
              localStorage.setItem(
                "fakeos-browser-mode-v2",
                e.target.checked ? "external" : "embedded",
              );
            }}
          />
          Regular tabs
        </label>
        <button>Go</button>
        <button
          type="button"
          onClick={() => {
            if (url) {
              const b = [...new Set([...bookmarks, url])];
              setBookmarks(b);
              localStorage.setItem("fakeos-bookmarks", JSON.stringify(b));
            }
          }}
        >
          ☆
        </button>
      </form>
      {url ? (
        <EmbeddedPage
          key={current.id + key + url + external}
          url={url}
          external={external}
          onRetry={() => {
            if (external) window.open(url, "_blank", "noopener,noreferrer");
            else setKey(key + 1);
          }}
        />
      ) : (
        <div className="browser-home">
          <h1>The web, at your fingertips.</h1>
          <p>
            {external
              ? "Websites open in a regular browser tab for full compatibility."
              : "Some websites cannot open inside FakeOS. Use Regular tabs if a page is blank."}
          </p>
          {["https://en.wikipedia.org", ...bookmarks].map((url) => (
            <button key={url} onClick={() => navigate(url)}>
              {new URL(url).hostname} ↗
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
