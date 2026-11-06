"use client";

const MAX_SIDE = 2000;

/** Shrink one photo in the browser to a JPEG of at most 2000 px. Keeps the original if it cannot be decoded (e.g. HEIC outside Safari) or is already small. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 700_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Compress every image file inside a form before it is sent. */
export async function compressForm(fd: FormData): Promise<FormData> {
  for (const [key, value] of [...fd.entries()]) {
    if (value instanceof File && value.size > 0) fd.set(key, await compressImage(value));
  }
  return fd;
}
