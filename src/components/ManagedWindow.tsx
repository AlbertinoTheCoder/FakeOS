import { lazy, Suspense } from "react";
import { motion } from "motion/react";
import { Minus, Maximize2, X } from "lucide-react";
import { useOS, type WindowState } from "../store";
import Icon from "./Icon";
import { playUiSound } from "../services/sounds";
const Application = lazy(() => import("../apps"));
export default function ManagedWindow({ window: w }: { window: WindowState }) {
  const os = useOS();
  const geometry = w.maximized
    ? {
        left: 6,
        top: 38,
        width: "calc(100% - 12px)",
        height: "calc(100% - 118px)",
      }
    : { left: w.x, top: w.y, width: w.width, height: w.height };
  const drag = (e: React.PointerEvent, resize = false) => {
    if (e.button !== 0 || w.maximized) return;
    e.preventDefault();
    os.focus(w.id);
    const x = e.clientX,
      y = e.clientY;
    const move = (event: PointerEvent) => {
      const dx = event.clientX - x,
        dy = event.clientY - y;
      if (resize)
        os.update(w.id, {
          width: Math.max(280, Math.min(innerWidth - w.x, w.width + dx)),
          height: Math.max(
            220,
            Math.min(innerHeight - w.y - 80, w.height + dy),
          ),
        });
      else
        os.update(w.id, {
          x: Math.max(0, Math.min(innerWidth - w.width, w.x + dx)),
          y: Math.max(35, Math.min(innerHeight - w.height - 80, w.y + dy)),
        });
    };
    const up = (event: PointerEvent) => {
      globalThis.window.removeEventListener("pointermove", move);
      globalThis.window.removeEventListener("pointerup", up);
      if (!resize) {
        if (event.clientY < 48) os.update(w.id, { maximized: true });
        else if (event.clientX < 20) {
          playUiSound("maximize");
          os.update(w.id, {
            x: 6,
            y: 38,
            width: innerWidth / 2 - 9,
            height: innerHeight - 118,
          });
        } else if (event.clientX > innerWidth - 20) {
          playUiSound("maximize");
          os.update(w.id, {
            x: innerWidth / 2 + 3,
            y: 38,
            width: innerWidth / 2 - 9,
            height: innerHeight - 118,
          });
        }
      }
    };
    globalThis.window.addEventListener("pointermove", move);
    globalThis.window.addEventListener("pointerup", up);
  };
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`window ${os.active === w.id ? "focused" : ""}`}
      style={{
        ...geometry,
        display: w.minimized ? "none" : "flex",
        zIndex: os.active === w.id ? 100 : 20 + os.windows.indexOf(w),
      }}
      onPointerDown={() => os.focus(w.id)}
      aria-label={w.app + " window"}
    >
      <div
        className="window-title"
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("button")) drag(e);
        }}
        onDoubleClick={() => os.update(w.id, { maximized: !w.maximized })}
      >
        <Icon app={w.app} size={15} />
        <strong>{w.app}</strong>
        <span>FakeOS</span>
        <div className="window-controls">
          <button
            aria-label="Minimize"
            onClick={() => os.update(w.id, { minimized: true })}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Maximize or restore"
            onClick={() => os.update(w.id, { maximized: !w.maximized })}
          >
            <Maximize2 size={14} />
          </button>
          <button aria-label="Close" onClick={() => os.close(w.id)}>
            <X size={17} />
          </button>
        </div>
      </div>
      <div className="window-content">
        <Suspense fallback={<div className="empty">Opening application…</div>}>
          <Application app={w.app} data={w.data} instanceId={w.id} />
        </Suspense>
      </div>
      {!w.maximized && (
        <div
          className="resize-handle"
          onPointerDown={(e) => drag(e, true)}
          aria-label="Resize window"
        />
      )}
    </motion.section>
  );
}
