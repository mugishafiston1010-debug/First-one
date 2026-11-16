/** Rebuilds readable text from the positioned fragments pdf.js returns. */

export interface PdfTextItem {
  str: string;
  /** [a, b, c, d, x, y] - we use x (4) and y (5). */
  transform: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

interface Line {
  y: number;
  height: number;
  text: string;
  lastX: number;
}

export function itemsToText(items: PdfTextItem[]): string {
  const lines: Line[] = [];
  let current: Line | null = null;

  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const height = item.height || Math.abs(item.transform?.[3] ?? 0) || 10;

    const sameLine = current !== null && Math.abs(current.y - y) < Math.max(2, height * 0.5);
    if (!current || !sameLine) {
      if (current) lines.push(current);
      current = { y, height, text: item.str, lastX: x + (item.width ?? 0) };
    } else {
      // Insert a space when fragments on a line are visibly separated.
      const gap = x - current.lastX;
      const needsSpace = gap > height * 0.18 && !current.text.endsWith(" ") && !item.str.startsWith(" ");
      current.text += (needsSpace ? " " : "") + item.str;
      current.lastX = x + (item.width ?? 0);
      current.height = Math.max(current.height, height);
    }
    if (item.hasEOL && current) {
      lines.push(current);
      current = null;
    }
  }
  if (current) lines.push(current);

  const visible = lines.filter((l) => l.text.trim().length > 0);
  if (!visible.length) return "";

  // Typical distance between consecutive lines; a clearly larger gap is a paragraph break.
  const gaps: number[] = [];
  for (let i = 1; i < visible.length; i++) {
    const g = visible[i - 1].y - visible[i].y;
    if (g > 0) gaps.push(g);
  }
  gaps.sort((a, b) => a - b);
  const typical = gaps.length ? gaps[Math.floor((gaps.length - 1) / 2)] : visible[0].height * 1.2;

  let out = visible[0].text.trim();
  for (let i = 1; i < visible.length; i++) {
    const gap = visible[i - 1].y - visible[i].y;
    const paragraphBreak = gap > typical * 1.45 || gap < -typical; // a jump back up means a new column or region
    out += (paragraphBreak ? "\n\n" : "\n") + visible[i].text.trim();
  }
  return out;
}
