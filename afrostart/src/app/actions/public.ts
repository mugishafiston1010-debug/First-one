"use server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, hashIp, tooMany } from "@/lib/rate-limit";
import { fieldErrors, formObject, submissionSchema, subscribeSchema } from "@/lib/validation";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

const GENERIC_ERROR = "Something went wrong. Please try again in a few minutes.";

/** "List your business": always stored as PENDING. Nothing becomes public until an admin approves it. */
export async function submitBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const values = formObject(fd);
  const parsed = submissionSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const v = parsed.data;

  const ipHash = hashIp(await clientIp());
  // Two limits: in-memory (fast) and database-backed (survives restarts and multiple servers).
  if (tooMany(`sub:${ipHash}`, 5, 60 * 60 * 1000)) return { message: "Too many submissions. Please try again later.", values };
  const recent = await db.businessSubmission.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } });
  if (recent >= 10) return { message: "Too many submissions today. Please try again tomorrow.", values };

  let cityId: string | null = null;
  if (v.cityId && v.cityId !== "other") {
    const city = await db.city.findUnique({ where: { id: v.cityId }, select: { id: true } });
    if (!city) return { errors: { cityId: "Choose a city from the list" }, values };
    cityId = city.id;
  }
  try {
    await db.businessSubmission.create({
      data: {
        name: v.name,
        category: v.category,
        cityId,
        cityOther: cityId ? null : v.cityOther,
        description: v.description,
        address: v.address,
        contactName: v.contactName,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
        website: v.website,
        ipHash,
      },
    });
  } catch (e) {
    console.error("submitBusiness failed", e);
    return { message: GENERIC_ERROR, values };
  }
  return { ok: true };
}

export async function subscribe(_: FormState, fd: FormData): Promise<FormState> {
  const values = formObject(fd);
  const parsed = subscribeSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const ip = hashIp(await clientIp());
  if (tooMany(`nl:${ip}`, 5, 60 * 60 * 1000)) return { message: "Too many attempts. Please try again later.", values };
  const locale = values.locale === "ru" ? "ru" : "en";
  try {
    // Same answer whether or not the address was already subscribed: does not reveal who is on the list.
    await db.subscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email, locale, token: randomBytes(24).toString("base64url") },
    });
  } catch (e) {
    console.error("subscribe failed", e);
    return { message: GENERIC_ERROR, values };
  }
  return { ok: true };
}
