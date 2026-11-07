import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full link starting with https://");
const optUrl = z
  .union([z.literal(""), httpUrl])
  .optional()
  .transform((v) => (v ? v : null));
const optDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const businessCategory = z.enum([
  "ACCOMMODATION",
  "FOOD_GROCERY",
  "RESTAURANT",
  "TRANSLATION",
  "TUTORING",
  "TRANSPORT",
  "STUDENT_SUPPORT",
  "OTHER",
]);
export const trustLevel = z.enum(["OFFICIAL", "EDITORIAL", "VERIFIED_PROVIDER", "STUDENT", "SPONSORED"]);

/** Public "List your business" form. Minimal personal data: a contact name and email only. */
export const submissionSchema = z
  .object({
    name: trimmed(120).min(2, "Enter the business name"),
    category: businessCategory,
    cityId: z.string().trim().max(40).optional(),
    cityOther: optText(80),
    description: trimmed(1500).min(30, "Describe the business in at least 30 characters"),
    address: optText(200),
    contactName: trimmed(80).min(2, "Enter a contact name"),
    contactEmail: z.string().trim().toLowerCase().max(160).pipe(z.email("Enter a valid email")),
    contactPhone: optText(30),
    website: optUrl,
    consent: z.literal("on", { message: "Please confirm the information is accurate" }),
    company: z.string().max(0).optional(), // honeypot: real people leave it empty
  })
  .refine((v) => (v.cityId && v.cityId !== "other") || v.cityOther, {
    message: "Choose a city or type its name",
    path: ["cityId"],
  });

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().max(160).pipe(z.email("Enter a valid email")),
  consent: z.literal("on", { message: "Please agree to receive updates" }),
  company: z.string().max(0).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(160).pipe(z.email()),
  password: z.string().min(1).max(200),
});

export const guideSchema = z.object({
  title: trimmed(160).min(3),
  slug,
  locale: z.enum(["en", "ru", "rw", "fr"]).default("en"),
  summary: trimmed(400).min(10),
  body: trimmed(50_000).min(20),
  categoryId: z.string().min(1, "Choose a category"),
  cityId: optText(40),
  country: optText(60),
  trust: trustLevel,
  published: checkbox,
  lastVerifiedAt: optDate,
  /** One source per line: "Label | https://link" */
  sources: z
    .string()
    .max(5000)
    .optional()
    .transform((v, ctx) => {
      const out: { label: string; url: string }[] = [];
      for (const [i, line] of (v ?? "").split("\n").entries()) {
        if (!line.trim()) continue;
        const [a, b] = line.includes("|") ? line.split("|") : [line, line];
        const url = b.trim();
        if (!httpUrl.safeParse(url).success) {
          ctx.addIssue({ code: "custom", message: `Source line ${i + 1}: needs a full https:// link` });
          return z.NEVER;
        }
        out.push({ label: a.trim().slice(0, 160) || url, url });
      }
      return out;
    }),
});

export const citySchema = z.object({
  name: trimmed(80).min(2),
  slug,
  region: optText(120),
  tagline: optText(160),
  intro: trimmed(5000).min(20),
  transportInfo: optText(5000),
  imageUrl: optUrl,
  imageCredit: optText(200),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
  published: checkbox,
  lastVerifiedAt: optDate,
});

export const universitySchema = z.object({
  name: trimmed(200).min(3),
  shortName: optText(40),
  websiteUrl: optUrl,
  description: optText(1000),
});

export const cityResourceSchema = z.object({
  kind: z.enum(["ACCOMMODATION", "TRANSPORT", "USEFUL_LOCATION", "LOCAL_RESOURCE", "OTHER"]),
  title: trimmed(160).min(2),
  description: trimmed(1500).min(5),
  url: optUrl,
  address: optText(200),
  trust: trustLevel,
  lastVerifiedAt: optDate,
});

export const businessSchema = z.object({
  name: trimmed(120).min(2),
  slug,
  description: trimmed(2000).min(10),
  category: businessCategory,
  cityId: z.string().min(1, "Choose a city"),
  address: optText(200),
  phone: optText(30),
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().max(160).pipe(z.email())])
    .optional()
    .transform((v) => (v ? v : null)),
  website: optUrl,
  telegram: optText(64),
  whatsapp: optText(30),
  instagram: optText(64),
  vk: optText(64),
  openingHours: optText(300),
  logoUrl: optUrl,
  published: checkbox,
  verified: checkbox,
  featured: checkbox,
});

export const placementSchema = z
  .object({
    slot: z.enum(["DIRECTORY_TOP", "HOMEPAGE", "CITY_PAGE"]),
    startsAt: optDate,
    endsAt: optDate,
    note: optText(300),
  })
  .refine((v) => v.startsAt && v.endsAt && v.endsAt >= v.startsAt, {
    message: "Choose a start and an end date (end on or after start)",
    path: ["endsAt"],
  });

export const opportunitySchema = z.object({
  title: trimmed(200).min(3),
  slug,
  type: z.enum(["SCHOLARSHIP", "ADMISSION", "COMPETITION", "INTERNSHIP", "EVENT", "PROGRAMME"]),
  summary: trimmed(400).min(10),
  description: trimmed(20_000).min(10),
  eligibility: trimmed(5000).min(5),
  countryEligibility: trimmed(300).min(2),
  deadline: optDate,
  applyUrl: httpUrl,
  sourceName: trimmed(160).min(2),
  sourceUrl: httpUrl,
  trust: trustLevel,
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  lastVerifiedAt: optDate,
});

/** Turns a zod error into { field: message } for forms. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "_");
    out[k] ??= issue.message;
  }
  return out;
}

export function formObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}
