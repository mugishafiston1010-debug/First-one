import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "./db";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Detect the real file type from its first bytes; never trust the browser's claim. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const ftyp = buf.subarray(4, 12).toString("ascii");
  if (ftyp.startsWith("ftypheic") || ftyp.startsWith("ftypmif1") || ftyp.startsWith("ftypheix")) return "image/heic";
  return null;
}

export class UploadError extends Error {}

// ---------- Backends ----------

/** Online: any S3-compatible private bucket (Supabase Storage, Cloudflare R2, AWS S3). */
function s3() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return {
    bucket: S3_BUCKET,
    client: new S3Client({
      endpoint: S3_ENDPOINT || undefined,
      region: S3_REGION || "auto",
      forcePathStyle: true,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    }),
  };
}

export function storageMode(): "s3" | "local" {
  return s3() ? "s3" : "local";
}

function localRoot() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

async function putObject(key: string, buf: Buffer, mime: string) {
  const s = s3();
  if (s) {
    await s.client.send(new PutObjectCommand({ Bucket: s.bucket, Key: key, Body: buf, ContentType: mime }));
    return;
  }
  const full = path.join(localRoot(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o600 });
}

export async function readUpload(key: string): Promise<Buffer> {
  if (key.includes("..")) throw new Error("Bad path");
  const s = s3();
  if (s) {
    const r = await s.client.send(new GetObjectCommand({ Bucket: s.bucket, Key: key }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  const full = path.resolve(localRoot(), key);
  if (!full.startsWith(localRoot() + path.sep)) throw new Error("Bad path");
  return readFile(full);
}

// ---------- Public API ----------

/** Save an uploaded file for a user, after checking its size and real type. */
export async function saveUpload(ownerId: string, kind: string, file: File) {
  if (!file || typeof file === "string" || file.size === 0) throw new UploadError("No file");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime) throw new UploadError("Only JPG, PNG, WEBP, HEIC or PDF files are accepted");
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const key = `${kind}/${randomUUID()}`;
  await putObject(key, buf, mime);
  return db.storedFile.create({ data: { ownerId, kind, mimeType: mime, size: buf.length, path: key, sha256 } });
}
