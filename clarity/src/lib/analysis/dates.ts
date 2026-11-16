/**
 * Date extraction. Finds explicit calendar dates and relative deadlines in a
 * piece of text and never guesses silently: anything inferred (a missing year,
 * an ambiguous 03/04/2027) is flagged so the UI can ask the reader to verify.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const MONTH = "(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\\.?";
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const YEAR = "((?:19|20)\\d{2})";

export interface FoundDate {
  /** yyyy-mm-dd, absent for relative deadlines. */
  iso?: string;
  raw: string;
  index: number;
  end: number;
  relative?: boolean;
  /** Set when the date needed an assumption; explains which one. */
  uncertainty?: string;
}

export interface DateContext {
  /** Used to infer a year when the document omits it. */
  now?: Date;
  /** Years that appear elsewhere in the document. */
  knownYears?: number[];
}

function valid(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function inferYear(m: number, d: number, ctx: DateContext): number {
  const now = ctx.now ?? new Date();
  const years = ctx.knownYears?.length ? ctx.knownYears : [now.getFullYear()];
  // Prefer the most common year in the document; fall back to the next occurrence.
  const counts = new Map<number, number>();
  for (const y of years) counts.set(y, (counts.get(y) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  if (ctx.knownYears?.length) return best;
  const thisYear = new Date(Date.UTC(now.getFullYear(), m - 1, d));
  return thisYear.getTime() < now.getTime() - 86400000 ? now.getFullYear() + 1 : now.getFullYear();
}

export function findYears(text: string): number[] {
  return [...text.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((m) => Number(m[1]));
}

export function findDates(text: string, ctx: DateContext = {}): FoundDate[] {
  const found: FoundDate[] = [];
  const taken: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);
  const add = (f: FoundDate) => {
    if (overlaps(f.index, f.end)) return;
    taken.push([f.index, f.end]);
    found.push(f);
  };
  const each = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    for (const m of text.matchAll(re)) fn(m as RegExpExecArray);
  };

  // 2027-01-15
  each(/\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/g, (m) => {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (valid(y, mo, d)) add({ iso: toIso(y, mo, d), raw: m[0], index: m.index, end: m.index + m[0].length });
  });

  // 15 January 2027 / 15th of January, 2027 / 15 January
  each(new RegExp(`\\b${DAY}(?:\\s+of)?\\s+${MONTH}(?:,?\\s+${YEAR})?(?![\\d])`, "gi"), (m) => {
    const d = Number(m[1]);
    const mo = MONTHS[m[2].toLowerCase()];
    pushNamed(m, d, mo, m[3] ? Number(m[3]) : undefined);
  });

  // January 15, 2027 / January 15th / Jan. 15 2027
  each(new RegExp(`\\b${MONTH}\\s+${DAY}(?!\\d)(?:,?\\s+${YEAR})?`, "gi"), (m) => {
    const mo = MONTHS[m[1].toLowerCase()];
    const d = Number(m[2]);
    pushNamed(m, d, mo, m[3] ? Number(m[3]) : undefined);
  });

  function pushNamed(m: RegExpExecArray, d: number, mo: number, y?: number) {
    // "May" is also a verb: require a year or an ordinal-looking day context.
    if (!y && /\bmay\b/.test(m[0])) return;
    const year = y ?? inferYear(mo, d, ctx);
    if (!valid(year, mo, d)) return;
    add({
      iso: toIso(year, mo, d),
      raw: m[0].trim().replace(/[,\s]+$/, ""),
      index: m.index,
      end: m.index + m[0].length,
      ...(y ? {} : { uncertainty: `The document gives no year here; ${year} is assumed.` }),
    });
  }

  // 15.01.2027 (day first)
  each(/\b(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})\b/g, (m) => {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (valid(y, mo, d)) add({ iso: toIso(y, mo, d), raw: m[0], index: m.index, end: m.index + m[0].length });
  });

  // 01/15/2027 or 15/01/2027 - order can be ambiguous.
  each(/\b(\d{1,2})\/(\d{1,2})\/((?:19|20)\d{2})\b/g, (m) => {
    const [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const base = { raw: m[0], index: m.index, end: m.index + m[0].length };
    if (a > 12 && valid(y, b, a)) add({ ...base, iso: toIso(y, b, a) });
    else if (b > 12 && valid(y, a, b)) add({ ...base, iso: toIso(y, a, b) });
    else if (a === b && valid(y, a, b)) add({ ...base, iso: toIso(y, a, b) });
    else if (valid(y, a, b))
      add({
        ...base,
        iso: toIso(y, a, b),
        uncertainty: `"${m[0]}" could be read day-first or month-first. Month-first is assumed.`,
      });
  });

  // Relative deadlines: "within 30 days of receiving this notice", "14 days before the start date"
  const UNIT = "(?:calendar\\s+|business\\s+|working\\s+)?(?:days?|weeks?|months?|years?)";
  const NUM = "(?:\\w+\\s+\\(\\d+\\)|\\d+|one|two|three|four|five|six|seven|ten|fourteen|thirty|sixty|ninety)";
  const TAIL = "(?:\\s+(?:of|after|from|following|before|prior\\s+to)\\s+[^.;,()]{3,60})?";
  each(new RegExp(`\\b(?:within|no\\s+(?:later|more)\\s+than|at\\s+least|not\\s+less\\s+than)\\s+${NUM}\\s+${UNIT}${TAIL}`, "gi"), (m) =>
    add({ raw: m[0].trim(), index: m.index, end: m.index + m[0].length, relative: true }),
  );
  each(new RegExp(`\\b${NUM}\\s+${UNIT}(?:'|’)?\\s+(?:(?:written\\s+|prior\\s+|advance\\s+)*notice|(?:before|after|prior\\s+to|from|following)\\s+[^.;,()]{3,60})`, "gi"), (m) =>
    add({ raw: m[0].trim(), index: m.index, end: m.index + m[0].length, relative: true }),
  );

  return found.sort((a, b) => a.index - b.index);
}

const DEADLINE_CUE =
  /\b(?:by|before|until|till|no later than|not later than|on or before|due(?: on| by| date)?|deadline(?: is| of| for)?|expires?(?: on)?|expiry|expiration|ends? on|closes? on|prior to|at the latest|must be (?:received|paid|submitted|completed|returned)(?: on| by)?)\b[^.;]{0,24}$/i;

/** Is the date at `index` introduced as a deadline ("by", "no later than", "due")? */
export function isDeadline(sentence: string, date: FoundDate): boolean {
  if (date.relative) return true;
  const before = sentence.slice(Math.max(0, date.index - 48), date.index);
  if (DEADLINE_CUE.test(before)) return true;
  return /\b(?:deadline|due date|closing date|expiry date|expiration date)\b/i.test(sentence);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string, style: "long" | "short" | "weekday" = "long"): string {
  const dt = parseIso(iso);
  if (style === "short") return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()].slice(0, 3)}`;
  const base = `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
  if (style === "weekday") return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()]}, ${base}`;
  return base;
}

export function todayIso(now: Date = new Date()): string {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Whole days from today until the date (negative when past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const a = parseIso(todayIso(now)).getTime();
  return Math.round((parseIso(iso).getTime() - a) / 86400000);
}

export function relativeLabel(iso: string, now: Date = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days ago`;
  if (n < 14) return `In ${n} days`;
  if (n < 60) return `In ${Math.round(n / 7)} weeks`;
  if (n < 365) return `In ${Math.round(n / 30)} months`;
  return `In ${(n / 365).toFixed(1).replace(/\.0$/, "")} years`;
}
