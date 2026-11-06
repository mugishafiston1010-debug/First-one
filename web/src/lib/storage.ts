import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./db";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Detect the real file type from its first bytes; never trust the browser's claim. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypheic") || buf.subarray(4, 12).toString("ascii").startsWith("ftypmif1"))
    return "image/heic";
  return null;
}

export class UploadError extends Error {}

function root() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

/** Save an uploaded file for a user. Local disk in development; swap for S3-compatible storage in production. */
export async function saveUpload(ownerId: string, kind: string, file: File) {
  if (!file || file.size === 0) throw new UploadError("No file");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime) throw new UploadError("Only JPG, PNG, WEBP, HEIC or PDF files are accepted");
  const dir = path.join(root(), kind);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}`;
  await writeFile(path.join(dir, name), buf, { mode: 0o600 });
  return db.storedFile.create({
    data: { ownerId, kind, mimeType: mime, size: buf.length, path: path.join(kind, name) },
  });
}

export async function readUpload(relPath: string) {
  const full = path.resolve(root(), relPath);
  if (!full.startsWith(root() + path.sep)) throw new Error("Bad path");
  return readFile(full);
}
