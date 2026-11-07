/** Only http(s) links are ever rendered. Blocks javascript:, data: and similar. */
export function safeHttpUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function telegramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const h = handle.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
  return /^[A-Za-z0-9_]{4,64}$/.test(h) ? `https://t.me/${h}` : null;
}

export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}
