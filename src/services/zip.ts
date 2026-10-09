import type { Entry } from "./filesystem";

const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(data: Uint8Array) { let c = 0xffffffff; for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function bytes(content: string) {
  if (!content.startsWith("data:")) return encoder.encode(content);
  const binary = atob(content.slice(content.indexOf(",") + 1));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function base64(data: Uint8Array) { let s = ""; for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode(...data.subarray(i, i + 0x8000)); return btoa(s); }
function dosDate(date: Date) { return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }; }

export function makeZip(files: Entry[]) {
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files.filter(x => x.kind === "file")) {
    const safeName = file.name.split(/[\\/]/).filter(part => part && part !== "." && part !== "..").join("/") || "file";
    const name = encoder.encode(safeName), data = bytes(file.content), crc = crc32(data), stamp = dosDate(new Date(file.updated));
    const head = new Uint8Array(30 + name.length), v = new DataView(head.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true); v.setUint16(8, 0, true); v.setUint16(10, stamp.time, true); v.setUint16(12, stamp.date, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, name.length, true); head.set(name, 30); local.push(head, data);
    const dir = new Uint8Array(46 + name.length), d = new DataView(dir.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x800, true); d.setUint16(10, 0, true); d.setUint16(12, stamp.time, true); d.setUint16(14, stamp.date, true); d.setUint32(16, crc, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, name.length, true); d.setUint32(42, offset, true); dir.set(name, 46); central.push(dir); offset += head.length + data.length;
  }
  const directorySize = central.reduce((n, x) => n + x.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer); ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  return new Blob([...local, ...central, end], { type: "application/zip" });
}

export async function readZip(file: File, parent: string): Promise<Entry[]> {
  const archive = new Uint8Array(await file.arrayBuffer()), view = new DataView(archive.buffer);
  if (archive.length > 100 * 1024 * 1024) throw new Error("ZIP files over 100 MB are not supported.");
  const result: Entry[] = [], folders = new Map<string, string>();
  for (let p = 0; p + 30 <= archive.length;) {
    if (view.getUint32(p, true) !== 0x04034b50) { p++; continue; }
    const method = view.getUint16(p + 8, true), compressed = view.getUint32(p + 18, true), nameLength = view.getUint16(p + 26, true), extraLength = view.getUint16(p + 28, true);
    if (compressed === 0xffffffff || p + 30 + nameLength + extraLength + compressed > archive.length) throw new Error("This ZIP uses a layout FakeOS cannot read.");
    const name = new TextDecoder().decode(archive.subarray(p + 30, p + 30 + nameLength));
    const data = archive.slice(p + 30 + nameLength + extraLength, p + 30 + nameLength + extraLength + compressed);
    if (!name.endsWith("/") && !name.startsWith("__MACOSX/")) {
      let plain = data;
      if (method === 8) { if (typeof DecompressionStream === "undefined") throw new Error("Your browser cannot decompress this ZIP format."); plain = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))).arrayBuffer()); }
      else if (method !== 0) throw new Error(`ZIP method ${method} is not supported.`);
      if (plain.length > 100 * 1024 * 1024) throw new Error("An item in this ZIP is over 100 MB.");
      const mime = name.toLowerCase().endsWith(".txt") ? "text/plain" : name.toLowerCase().endsWith(".png") ? "image/png" : name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
      const content = mime.startsWith("text/") ? new TextDecoder().decode(plain) : `data:${mime};base64,${base64(plain)}`;
      const parts = name.replace(/\\/g, "/").split("/").filter(part => part && part !== "." && part !== "..");
      let destination = parent, path = "";
      for (const segment of parts.slice(0, -1)) { path = path ? `${path}/${segment}` : segment; let id = folders.get(path); if (!id) { id = crypto.randomUUID(); folders.set(path, id); result.push({ id, name: segment, parent: destination, kind: "folder", content: "", mime: "", updated: Date.now() }); } destination = id; }
      result.push({ id: crypto.randomUUID(), name: parts.at(-1) || "file", parent: destination, kind: "file", content, mime, updated: Date.now() });
    }
    p += 30 + nameLength + extraLength + compressed;
  }
  return result;
}
