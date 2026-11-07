import { describe, expect, it } from "vitest";
import { daysLeft, effectiveStatus, openWhere } from "./opportunity-status";
import { directorySort, isPlacementActive } from "./sponsorship";
import { slugify } from "./slug";
import { safeHttpUrl, telegramUrl, whatsappUrl } from "./safe-url";
import { guideSchema, opportunitySchema, placementSchema, submissionSchema, subscribeSchema } from "./validation";
import { parseProgress, serializeProgress } from "./checklist-store";

const d = (s: string) => new Date(s);

describe("opportunity status", () => {
  const now = d("2026-11-07T12:00:00Z");
  it("open before and on the deadline day", () => {
    expect(effectiveStatus({ status: "OPEN", deadline: d("2026-11-08T00:00:00Z") }, now)).toBe("OPEN");
    expect(effectiveStatus({ status: "OPEN", deadline: d("2026-11-07T00:00:00Z") }, now)).toBe("OPEN");
  });
  it("expired automatically the day after the deadline", () => {
    expect(effectiveStatus({ status: "OPEN", deadline: d("2026-11-06T00:00:00Z") }, now)).toBe("EXPIRED");
  });
  it("no deadline stays open; draft and closed are respected", () => {
    expect(effectiveStatus({ status: "OPEN", deadline: null }, now)).toBe("OPEN");
    expect(effectiveStatus({ status: "DRAFT", deadline: d("2030-01-01") }, now)).toBe("DRAFT");
    expect(effectiveStatus({ status: "CLOSED", deadline: d("2030-01-01") }, now)).toBe("CLOSED");
  });
  it("days left", () => {
    expect(daysLeft(d("2026-11-07T00:00:00Z"), now)).toBe(0);
    expect(daysLeft(d("2026-11-10T00:00:00Z"), now)).toBe(3);
  });
  it("database filter matches the same rule", () => {
    const w = openWhere(now);
    expect(w.status).toBe("OPEN");
    expect(w.OR[1]).toEqual({ deadline: { gte: d("2026-11-07T00:00:00Z") } });
  });
});

describe("sponsorship and ordering", () => {
  it("placement active only inside its window", () => {
    const p = { startsAt: d("2026-11-01"), endsAt: d("2026-11-30") };
    expect(isPlacementActive(p, d("2026-11-07"))).toBe(true);
    expect(isPlacementActive(p, d("2026-12-01"))).toBe(false);
  });
  it("sponsored first, then team picks, then verified", () => {
    const base = { publishedAt: null, sponsored: false, featured: false, verified: false };
    const list = directorySort([
      { ...base, name: "C plain" },
      { ...base, name: "B verified", verified: true },
      { ...base, name: "A sponsored", sponsored: true },
      { ...base, name: "D pick", featured: true },
    ]);
    expect(list.map((x) => x.name)).toEqual(["A sponsored", "D pick", "B verified", "C plain"]);
  });
});

describe("slugs and links", () => {
  it("slugifies English and Russian", () => {
    expect(slugify("Saint Petersburg!")).toBe("saint-petersburg");
    expect(slugify("Африканский магазин")).toBe("afrikanskiy-magazin");
    expect(slugify("***")).toBe("item");
  });
  it("only allows http(s) links", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("https://tpu.ru")).toBe("https://tpu.ru/");
  });
  it("builds safe Telegram and WhatsApp links", () => {
    expect(telegramUrl("@afro_shop")).toBe("https://t.me/afro_shop");
    expect(telegramUrl("bad name<script>")).toBeNull();
    expect(whatsappUrl("+7 (999) 123-45-67")).toBe("https://wa.me/79991234567");
  });
});

describe("validation", () => {
  const ok = {
    name: "Kigali Kitchen", category: "RESTAURANT", cityId: "c1", description: "African food in the city centre, open every day for students.",
    contactName: "Jean", contactEmail: "JEAN@Example.com ", consent: "on",
  };
  it("accepts a valid submission and normalises email", () => {
    const r = submissionSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactEmail).toBe("jean@example.com");
  });
  it("rejects spam honeypot, missing consent, bad links and short descriptions", () => {
    expect(submissionSchema.safeParse({ ...ok, company: "bot" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...ok, website: "javascript:alert(1)" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...ok, description: "too short" }).success).toBe(false);
  });
  it("needs a city or a typed city name", () => {
    expect(submissionSchema.safeParse({ ...ok, cityId: "other" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...ok, cityId: "other", cityOther: "Ufa" }).success).toBe(true);
  });
  it("newsletter needs consent", () => {
    expect(subscribeSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: "a@b.co", consent: "on" }).success).toBe(true);
  });
  it("parses guide sources and rejects non-http sources", () => {
    const base = { title: "Guide", summary: "A short summary", body: "Body text long enough here.", categoryId: "x", trust: "EDITORIAL" };
    const r = guideSchema.safeParse({ ...base, sources: "Official portal | https://russia.study\n\nhttps://tpu.ru" });
    expect(r.success && r.data.sources).toEqual([{ label: "Official portal", url: "https://russia.study" }, { label: "https://tpu.ru", url: "https://tpu.ru" }]);
    expect(guideSchema.safeParse({ ...base, sources: "x | ftp://bad" }).success).toBe(false);
    expect(guideSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });
  it("opportunity needs official https links", () => {
    const o = { title: "Scholarship", type: "SCHOLARSHIP", summary: "Summary text", description: "Description", eligibility: "Everyone", countryEligibility: "All", applyUrl: "https://x.org", sourceName: "Uni", sourceUrl: "https://x.org", trust: "OFFICIAL", status: "OPEN" };
    expect(opportunitySchema.safeParse(o).success).toBe(true);
    expect(opportunitySchema.safeParse({ ...o, applyUrl: "x.org" }).success).toBe(false);
  });
  it("placement end must be on or after start", () => {
    expect(placementSchema.safeParse({ slot: "HOMEPAGE", startsAt: "2026-11-10", endsAt: "2026-11-01" }).success).toBe(false);
    expect(placementSchema.safeParse({ slot: "HOMEPAGE", startsAt: "2026-11-01", endsAt: "2026-11-30" }).success).toBe(true);
  });
});

describe("checklist progress", () => {
  it("round-trips and drops unknown or corrupted data", () => {
    const s = parseProgress(serializeProgress(new Set(["uni-shortlist", "not-a-real-item"])));
    expect([...s]).toEqual(["uni-shortlist"]);
    expect(parseProgress("{broken").size).toBe(0);
    expect(parseProgress(null).size).toBe(0);
  });
});
