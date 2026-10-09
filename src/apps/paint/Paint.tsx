import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS } from "../../store";
import { download } from "../../utils/download";
import { floodFill } from "./raster";
type Tool = "brush" | "eraser" | "fill" | "line" | "rectangle" | "ellipse";
export default function Paint({
  data,
  instanceId,
}: {
  data?: string;
  instanceId?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pointer = useRef<number | null>(null),
    start = useRef({ x: 0, y: 0 }),
    base = useRef<ImageData | null>(null),
    undo = useRef<ImageData[]>([]),
    redo = useRef<ImageData[]>([]);
  const [color, setColor] = useState("#a78bfa"),
    [size, setSize] = useState(8),
    [tool, setTool] = useState<Tool>("brush"),
    [name, setName] = useState("Drawing.png"),
    [zoom, setZoom] = useState(1),
    [filled, setFilled] = useState(false),
    [dirty, setDirty] = useState(false),
    [fileId, setFileId] = useState<string | undefined>(data),
    [images, setImages] = useState<Entry[]>([]),
    [picker, setPicker] = useState(false),
    [revision, setRevision] = useState(0),
    [dimensions, setDimensions] = useState({ width: 1000, height: 650 });
  const notify = useOS((s) => s.notify);
  const filename = () => {
    const value = name.trim().replace(/[\\/]/g, "-") || "Drawing";
    return /\.png$/i.test(value) ? value : value + ".png";
  };
  const readImage = (source: string, title: string, id?: string) => {
    const image = new Image();
    image.onload = () => {
      const c = canvas.current;
      if (!c) return;
      const ratio = Math.min(1, 2000 / Math.max(image.width, image.height));
      c.width = Math.max(1, Math.round(image.width * ratio));
      c.height = Math.max(1, Math.round(image.height * ratio));
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      setDimensions({ width: c.width, height: c.height });
      setName(title.replace(/\.[^.]+$/, "") + ".png");
      setFileId(id);
      setDirty(false);
      setZoom(1);
      undo.current = [];
      redo.current = [];
      setRevision((v) => v + 1);
      if (ratio < 1)
        notify(
          "Image resized",
          "Large images are scaled to 2000 pixels to keep Paint responsive.",
        );
    };
    image.onerror = () =>
      notify("Cannot open image", "Choose a valid PNG, JPEG, or WebP image.");
    image.src = source;
  };
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    if (data)
      fs.all()
        .then((all) => {
          const file = all.find((f) => f.id === data);
          if (file && file.mime.startsWith("image/"))
            readImage(file.content, file.name, file.id);
          else notify("Image not found", "It may have been moved or deleted.");
        })
        .catch((e) => notify("Open failed", String(e)));
  }, [data]);
  useEffect(() => {
    if (instanceId) useOS.getState().update(instanceId, { dirty });
  }, [dirty, instanceId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const snapshot = () => {
    const c = canvas.current!;
    const image = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
    undo.current.push(image);
    const limit = Math.max(
      1,
      Math.min(25, Math.floor((32 * 1024 * 1024) / image.data.length)),
    );
    while (undo.current.length > limit) undo.current.shift();
    redo.current = [];
    setRevision((v) => v + 1);
    return image;
  };
  const restore = (from: ImageData[], to: ImageData[]) => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!,
      image = from.pop();
    if (image) {
      to.push(ctx.getImageData(0, 0, c.width, c.height));
      ctx.putImageData(image, 0, 0);
      setDirty(true);
      setRevision((v) => v + 1);
    }
  };
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget,
      r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  };
  const shape = (end: { x: number; y: number }) => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    if (base.current) ctx.putImageData(base.current, 0, 0);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.beginPath();
    const x = Math.min(start.current.x, end.x),
      y = Math.min(start.current.y, end.y),
      w = Math.abs(end.x - start.current.x),
      h = Math.abs(end.y - start.current.y);
    if (tool === "line") {
      ctx.moveTo(start.current.x, start.current.y);
      ctx.lineTo(end.x, end.y);
    } else if (tool === "rectangle") ctx.rect(x, y, w, h);
    else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (filled && tool !== "line") ctx.fill();
    else ctx.stroke();
  };
  const saveLocal = async () => {
    try {
      const c = canvas.current!;
      const title = filename();
      const old = fileId
        ? (await fs.all()).find((f) => f.id === fileId)
        : undefined;
      if (old && old.name === title)
        await fs.put({
          ...old,
          content: c.toDataURL("image/png"),
          mime: "image/png",
          updated: Date.now(),
        });
      else {
        const file = await fs.create(
          title,
          "Pictures",
          "file",
          c.toDataURL("image/png"),
          "image/png",
        );
        setFileId(file.id);
      }
      setDirty(false);
      notify("Drawing saved", title + " is in FakeOS Pictures.");
    } catch (e) {
      notify("Save failed", String(e));
    }
  };
  const confirmOpen = () =>
    !dirty ||
    confirm("Discard unsaved drawing changes and open another image?");
  return (
    <div className="app-column paint" data-revision={revision}>
      <div className="toolbar wrap">
        <input
          aria-label="Drawing filename"
          className="drawing-filename"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="accent"
          onClick={() => {
            download(filename(), canvas.current!.toDataURL("image/png"));
            setDirty(false);
          }}
        >
          Save PNG
        </button>
        <button onClick={saveLocal}>Save to FakeOS Pictures</button>
        <label className="button">
          Open PNG
          <input
            aria-label="Open image from computer"
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && confirmOpen()) {
                const reader = new FileReader();
                reader.onload = () =>
                  readImage(String(reader.result), file.name);
                reader.onerror = () =>
                  notify("Open failed", "Unable to read this image.");
                reader.readAsDataURL(file);
              }
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={() => {
            if (confirmOpen())
              fs.all().then((all) => {
                setImages(
                  all.filter(
                    (f) =>
                      f.kind === "file" &&
                      f.mime.startsWith("image/") &&
                      f.parent !== "Trash",
                  ),
                );
                setPicker(true);
              });
          }}
        >
          Open saved drawing
        </button>
      </div>
      <div className="toolbar wrap">
        <select
          aria-label="Paint tool"
          value={tool}
          onChange={(e) => setTool(e.target.value as Tool)}
        >
          {["brush", "eraser", "fill", "line", "rectangle", "ellipse"].map(
            (t) => (
              <option key={t} value={t}>
                {t === "fill" ? "Fill bucket" : t[0].toUpperCase() + t.slice(1)}
              </option>
            ),
          )}
        </select>
        <input
          aria-label="Brush color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          aria-label="Brush size"
          type="range"
          min="1"
          max="50"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <label>
          <input
            type="checkbox"
            checked={filled}
            onChange={(e) => setFilled(e.target.checked)}
          />
          Filled shapes
        </label>
        <button
          disabled={!undo.current.length}
          onClick={() => restore(undo.current, redo.current)}
        >
          Undo
        </button>
        <button
          disabled={!redo.current.length}
          onClick={() => restore(redo.current, undo.current)}
        >
          Redo
        </button>
        <button
          onClick={() => {
            snapshot();
            const c = canvas.current!,
              ctx = c.getContext("2d")!;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, c.width, c.height);
            setDirty(true);
          }}
        >
          Clear
        </button>
        <select
          aria-label="Canvas zoom"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        >
          {[0.5, 1, 1.5, 2, 3].map((v) => (
            <option key={v} value={v}>
              {v * 100}%
            </option>
          ))}
        </select>
      </div>
      {picker && (
        <div className="paint-picker">
          <div className="toolbar">
            <strong>Saved drawings</strong>
            <button onClick={() => setPicker(false)}>Close picker</button>
          </div>
          {images.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                readImage(f.content, f.name, f.id);
                setPicker(false);
              }}
            >
              {f.name}
            </button>
          ))}
          {!images.length && (
            <p>No saved images yet. Save a drawing to FakeOS Pictures first.</p>
          )}
        </div>
      )}
      <div className="paint-surface">
        <canvas
          ref={canvas}
          width={1000}
          height={650}
          aria-label="Drawing canvas"
          style={{
            width: zoom * 100 + "%",
            aspectRatio: dimensions.width + "/" + dimensions.height,
          }}
          onPointerDown={(e) => {
            if (e.button !== 0 || pointer.current !== null) return;
            e.preventDefault();
            const c = e.currentTarget,
              ctx = c.getContext("2d")!,
              p = point(e);
            base.current = snapshot();
            setDirty(true);
            if (tool === "fill") {
              const image = ctx.getImageData(0, 0, c.width, c.height);
              floodFill(image, p.x, p.y, color);
              ctx.putImageData(image, 0, 0);
              return;
            }
            pointer.current = e.pointerId;
            start.current = p;
            c.setPointerCapture(e.pointerId);
            if (tool === "brush" || tool === "eraser") {
              ctx.beginPath();
              ctx.fillStyle = tool === "eraser" ? "white" : color;
              ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
            } else shape(p);
          }}
          onPointerMove={(e) => {
            if (pointer.current !== e.pointerId) return;
            const p = point(e),
              ctx = e.currentTarget.getContext("2d")!;
            if (tool === "brush" || tool === "eraser") {
              ctx.strokeStyle = tool === "eraser" ? "white" : color;
              ctx.lineWidth = size;
              ctx.lineCap = "round";
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            } else shape(p);
          }}
          onPointerUp={(e) => {
            if (pointer.current === e.pointerId) {
              if (!["brush", "eraser"].includes(tool)) shape(point(e));
              pointer.current = null;
            }
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
          onLostPointerCapture={() => {
            pointer.current = null;
          }}
        />
      </div>
      <small className="paint-save-hint">
        {dimensions.width} × {dimensions.height} ·{" "}
        {dirty ? "Unsaved changes" : "Saved"} · Save PNG downloads to your
        device.
      </small>
    </div>
  );
}
