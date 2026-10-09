import { useEffect, useState } from "react";
import type { Entry } from "../../services/filesystem";
import { useOS } from "../../store";
import { download } from "../../utils/download";
export default function FilePreview({
  file,
  onClose,
}: {
  file: Entry;
  onClose: () => void;
}) {
  const [source, setSource] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let objectUrl = "";
    setError("");
    try {
      const match = file.content.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
      if (!match) throw Error("This file has no supported preview data.");
      const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
      const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
      setSource(objectUrl);
    } catch (e) {
      setError(String(e));
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return (
    <div className="image-preview">
      <div className="toolbar wrap">
        <strong>{file.name}</strong>
        {file.mime.startsWith("image/") && (
          <button onClick={() => useOS.getState().open("Paint", file.id)}>
            Edit in Paint
          </button>
        )}
        <button onClick={() => download(file.name, file.content)}>
          Download
        </button>
        <button onClick={onClose}>Close preview</button>
      </div>
      {error ? (
        <div className="empty">
          {error}
          <br />
          Download the file to open it on your device.
        </div>
      ) : source ? (
        file.mime.startsWith("image/") ? (
          <img src={source} alt={file.name} />
        ) : file.mime.startsWith("video/") ? (
          <video
            aria-label="Video preview"
            src={source}
            controls
            playsInline
            onError={() =>
              setError("This browser cannot play this video format.")
            }
          />
        ) : (
          <>
            <small className="preview-hint">
              PDF display depends on your browser. Use Download if the document
              does not appear.
            </small>
            <object
              aria-label="PDF preview"
              data={source}
              type="application/pdf"
            >
              <p>
                PDF preview is unavailable. Use Download to open it on your
                device.
              </p>
            </object>
          </>
        )
      ) : (
        <div className="empty">Preparing preview…</div>
      )}
    </div>
  );
}
