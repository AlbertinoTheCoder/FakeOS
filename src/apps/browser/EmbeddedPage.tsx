import { useEffect, useState } from "react";
export default function EmbeddedPage({
  url,
  external,
  onRetry,
}: {
  url: string;
  external: boolean;
  onRetry: () => void;
}) {
  const [loading, setLoading] = useState(true),
    [slow, setSlow] = useState(false),
    [help, setHelp] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const insecure = location.protocol === "https:" && url.startsWith("http:");
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setLoading(true);
        setSlow(false);
      }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!loading || external || insecure) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [loading, external, insecure]);
  const fallback = external || insecure || !online;
  return (
    <>
      <div className="embed-warning browser-status">
        <span role="status">
          {!online
            ? "Your browser reports that you are offline."
            : external
              ? "Regular browser tab mode"
              : insecure
                ? "This HTTP page needs a regular browser tab."
                : loading
                  ? "Loading website…"
                  : "If the page is blank or says “refused to connect”, try a regular browser tab."}
        </span>
        <a
          className="button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open website ↗
        </a>
        {!fallback && (
          <button onClick={() => setHelp(!help)}>Page not working?</button>
        )}
      </div>
      {(slow || help) && !fallback && (
        <div className="browser-recovery">
          <strong>
            {slow
              ? "This page is taking a while."
              : "Having trouble opening this page?"}
          </strong>
          <p>
            The website may be slow, unavailable, or may block opening inside
            FakeOS. FakeOS cannot reliably detect which happened.
          </p>
          <a
            className="button accent"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in a regular browser tab ↗
          </a>
          <button onClick={onRetry}>Retry inside FakeOS</button>
          <button
            onClick={() => {
              setHelp(false);
              setSlow(false);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {fallback ? (
        <div className="browser-home">
          <h2>
            {!online
              ? "You appear to be offline"
              : insecure
                ? "Open this page in your browser"
                : "Website opens in a separate tab"}
          </h2>
          <p>
            {!online
              ? "Check your connection, then retry."
              : insecure
                ? "Your secure FakeOS preview cannot embed an unencrypted HTTP page."
                : "If no tab appeared, click Open website below. Your browser may have blocked the automatic tab."}
          </p>
          <a
            className="button accent"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open website ↗
          </a>
          <button onClick={onRetry}>Retry</button>
        </div>
      ) : (
        <iframe
          title="Web page"
          src={url}
          onLoad={() => {
            setLoading(false);
            setSlow(false);
          }}
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </>
  );
}
