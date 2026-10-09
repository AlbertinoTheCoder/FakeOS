import { useEffect, useRef, useState } from "react";
import { fs, type Entry } from "../../services/filesystem";
import { useOS, type AppId } from "../../store";
import { download } from "../../utils/download";
export default function Music() {
  const sound = useOS((s) => s.prefs.sound);
  const [tracks, setTracks] = useState<Entry[]>([]),
    [index, setIndex] = useState(0);
  const load = () =>
    fs
      .all()
      .then((all) => setTracks(all.filter((e) => e.mime.startsWith("audio/"))));
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="music">
      <div className="album">♫</div>
      <h2>{tracks[index]?.name || "Your personal soundtrack"}</h2>
      <p>Import audio to build your local library.</p>
      <label className="button">
        Import audio
        <input
          hidden
          type="file"
          accept="audio/*"
          multiple
          onChange={async (e) => {
            for (const f of Array.from(e.target.files || [])) {
              const content = await new Promise<string>((resolve) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.readAsDataURL(f);
              });
              await fs.create(f.name, "Music", "file", content, f.type);
            }
            load();
          }}
        />
      </label>
      <audio
        muted={!sound}
        controls
        src={tracks[index]?.content}
        onEnded={() => setIndex((index + 1) % Math.max(1, tracks.length))}
      />
      <div className="toolbar">
        <button
          onClick={() =>
            setIndex((index - 1 + tracks.length) % Math.max(1, tracks.length))
          }
        >
          Previous
        </button>
        <button
          onClick={() => setIndex((index + 1) % Math.max(1, tracks.length))}
        >
          Next
        </button>
      </div>
      {tracks.map((t, i) => (
        <button key={t.id} onClick={() => setIndex(i)}>
          {i === index ? "♫ " : ""}
          {t.name}
        </button>
      ))}
    </div>
  );
}
