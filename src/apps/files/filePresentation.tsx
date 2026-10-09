import { FileText, Folder, Image, Music2, Film, File, Link2, Archive } from "lucide-react";
import type { Entry } from "../../services/filesystem";
import { shortcutMime } from "../../services/shortcuts";
export function fileKind(entry: Entry) {
  if (entry.kind === "folder") return "Folder";
  if (entry.mime === shortcutMime) return "Shortcut";
  if (entry.mime.startsWith("image/")) return "Image";
  if (entry.mime.startsWith("audio/")) return "Audio";
  if (entry.mime.startsWith("video/")) return "Video";
  if (entry.mime === "application/fakeos-note") return "Note";
  if (entry.mime === "application/pdf") return "PDF document";
  if (entry.mime.startsWith("text/")) return "Text document";
  return entry.name.endsWith(".zip") ? "Archive" : "File";
}
export function fileSize(entry: Entry) {
  const bytes = entry.content.startsWith("data:") && entry.content.includes(";base64,") ? Math.max(0, Math.floor(entry.content.split(",")[1].length * 3 / 4) - (entry.content.endsWith("==") ? 2 : entry.content.endsWith("=") ? 1 : 0)) : new Blob([entry.content]).size;
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
export function FileArtwork({ entry }: { entry: Entry }) {
  const kind = fileKind(entry);
  const Glyph = entry.kind === "folder" ? Folder : kind === "Shortcut" ? Link2 : kind === "Image" ? Image : kind === "Audio" ? Music2 : kind === "Video" ? Film : kind === "Archive" ? Archive : ["Text document", "Note", "PDF document"].includes(kind) ? FileText : File;
  return <span className={`file-artwork file-artwork-${entry.kind === "folder" ? "folder" : kind.toLowerCase().split(" ")[0]}`}>
    {kind === "Image" && entry.content.startsWith("data:image/") ? <img src={entry.content} alt="" loading="lazy" /> : <Glyph size={32} strokeWidth={1.5} />}
  </span>;
}
