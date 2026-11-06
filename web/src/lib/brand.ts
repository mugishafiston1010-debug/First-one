export const BRAND = process.env.NEXT_PUBLIC_BRAND || "Inzira";
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "";
export const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM || "";

export function whatsappLink(text?: string) {
  if (!WHATSAPP) return "#";
  return `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
