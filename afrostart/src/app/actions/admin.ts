"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin, requireOwner, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import {
  businessSchema, cityResourceSchema, citySchema, fieldErrors, formObject, guideSchema,
  opportunitySchema, placementSchema, universitySchema,
} from "@/lib/validation";

export type AdminFormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

type SlugModel = "guide" | "city" | "business" | "opportunity" | "university";

/** Unique slug: "kazan", "kazan-2", ... Guides are unique per (slug, locale). */
async function uniqueSlug(model: SlugModel, base: string, excludeId?: string, locale?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 1; i < 500; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    const where = { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}), ...(model === "guide" ? { locale } : {}) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exists = await (db[model] as any).findFirst({ where, select: { id: true } });
    if (!exists) return slug;
  }
  return `${root}-${Date.now()}`;
}

function failed(e: unknown): AdminFormState {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { message: "That address (slug) is already used. Choose another." };
    if (e.code === "P2003") return { message: "This item is still used by other content. Remove or move that content first." };
    if (e.code === "P2025") return { message: "This item no longer exists." };
  }
  console.error(e);
  return { message: "Could not save. Please try again." };
}

// ─────────────── Guides ───────────────

export async function saveGuide(id: string | null, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = guideSchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  const { sources, ...v } = p.data;
  let savedId = id;
  try {
    const slug = v.slug ?? (await uniqueSlug("guide", v.title, id ?? undefined, v.locale));
    const existing = id ? await db.guide.findUnique({ where: { id }, select: { publishedAt: true } }) : null;
    const data = { ...v, slug, publishedAt: v.published ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null) };
    await db.$transaction(async (tx) => {
      const g = id ? await tx.guide.update({ where: { id }, data }) : await tx.guide.create({ data: { ...data, authorId: admin.id } });
      savedId = g.id;
      await tx.guideSource.deleteMany({ where: { guideId: g.id } });
      if (sources.length) await tx.guideSource.createMany({ data: sources.map((s, i) => ({ ...s, guideId: g.id, sort: i })) });
    });
    await audit(admin.id, id ? "update" : "create", "Guide", savedId!, v.title);
  } catch (e) {
    return failed(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/guides/${savedId}?saved=1`);
}

export async function setGuidePublished(id: string, published: boolean) {
  const admin = await requireAdmin();
  const g = await db.guide.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!g) return;
  await db.guide.update({ where: { id }, data: { published, publishedAt: published ? (g.publishedAt ?? new Date()) : g.publishedAt } });
  await audit(admin.id, published ? "publish" : "unpublish", "Guide", id);
  revalidatePath("/", "layout");
}

export async function deleteGuide(id: string) {
  const admin = await requireAdmin();
  await db.guide.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "Guide", id);
  redirect("/admin/guides");
}

export async function saveCategory(id: string | null, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional(),
    stage: z.enum(["BEFORE_TRAVEL", "AFTER_ARRIVAL", "STUDENT_LIFE"]),
    sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
  }).safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  try {
    if (id) await db.guideCategory.update({ where: { id }, data: p.data });
    else {
      let slug = slugify(p.data.name);
      if (await db.guideCategory.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      await db.guideCategory.create({ data: { ...p.data, slug } });
    }
    await audit(admin.id, id ? "update" : "create", "GuideCategory", id ?? undefined, p.data.name);
  } catch (e) {
    return failed(e);
  }
  revalidatePath("/admin/categories");
  return { ok: true, message: "Saved." };
}

// ─────────────── Cities ───────────────

export async function saveCity(id: string | null, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = citySchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  let savedId = id;
  try {
    const slug = p.data.slug ?? (await uniqueSlug("city", p.data.name, id ?? undefined));
    const c = id ? await db.city.update({ where: { id }, data: { ...p.data, slug } }) : await db.city.create({ data: { ...p.data, slug } });
    savedId = c.id;
    await audit(admin.id, id ? "update" : "create", "City", c.id, c.name);
  } catch (e) {
    return failed(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/cities/${savedId}?saved=1`);
}

export async function deleteCity(id: string) {
  const admin = await requireAdmin();
  const used = await db.business.count({ where: { cityId: id } });
  if (used) redirect(`/admin/cities/${id}?error=has-businesses`);
  await db.city.delete({ where: { id } });
  await audit(admin.id, "delete", "City", id);
  redirect("/admin/cities");
}

export async function addUniversity(cityId: string, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = universitySchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  try {
    const slug = await uniqueSlug("university", p.data.shortName ?? p.data.name);
    const lastVerifiedAt = fd.get("verifiedNow") === "on" ? new Date() : null;
    const u = await db.university.create({ data: { ...p.data, slug, cityId, lastVerifiedAt } });
    await audit(admin.id, "create", "University", u.id, u.name);
  } catch (e) {
    return failed(e);
  }
  revalidatePath(`/admin/cities/${cityId}`);
  return { ok: true, message: "University added." };
}

export async function deleteUniversity(id: string) {
  const admin = await requireAdmin();
  const u = await db.university.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "University", id);
  if (u) revalidatePath(`/admin/cities/${u.cityId}`);
}

export async function addCityResource(cityId: string, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = cityResourceSchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  try {
    const r = await db.cityResource.create({ data: { ...p.data, cityId } });
    await audit(admin.id, "create", "CityResource", r.id, r.title);
  } catch (e) {
    return failed(e);
  }
  revalidatePath(`/admin/cities/${cityId}`);
  return { ok: true, message: "Resource added." };
}

export async function deleteCityResource(id: string) {
  const admin = await requireAdmin();
  const r = await db.cityResource.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "CityResource", id);
  if (r) revalidatePath(`/admin/cities/${r.cityId}`);
}

// ─────────────── Businesses ───────────────

export async function saveBusiness(id: string | null, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = businessSchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  let savedId = id;
  try {
    const v = p.data;
    const existing = id ? await db.business.findUnique({ where: { id }, select: { publishedAt: true, verifiedAt: true, verified: true } }) : null;
    const slug = v.slug ?? (await uniqueSlug("business", v.name, id ?? undefined));
    const data = {
      ...v,
      slug,
      publishedAt: v.published ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
      // Verification date is when an admin turned "verified" on. Turning it off clears it.
      verifiedAt: v.verified ? (existing?.verified ? existing.verifiedAt : new Date()) : null,
    };
    const b = id ? await db.business.update({ where: { id }, data }) : await db.business.create({ data });
    savedId = b.id;
    await audit(admin.id, id ? "update" : "create", "Business", b.id, `${b.name} published=${b.published} verified=${b.verified}`);
  } catch (e) {
    return failed(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/businesses/${savedId}?saved=1`);
}

export async function deleteBusiness(id: string) {
  const admin = await requireAdmin();
  await db.business.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "Business", id);
  redirect("/admin/businesses");
}

export async function addPlacement(businessId: string, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = placementSchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  const end = new Date(p.data.endsAt!);
  end.setUTCHours(23, 59, 59, 999);
  const pl = await db.sponsoredPlacement.create({ data: { businessId, slot: p.data.slot, startsAt: p.data.startsAt!, endsAt: end, note: p.data.note } });
  await audit(admin.id, "create", "SponsoredPlacement", pl.id, `${p.data.slot} for ${businessId}`);
  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true, message: "Sponsored placement added. It will be labelled “Sponsored” while active." };
}

export async function deletePlacement(id: string) {
  const admin = await requireAdmin();
  const pl = await db.sponsoredPlacement.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "SponsoredPlacement", id);
  if (pl) revalidatePath(`/admin/businesses/${pl.businessId}`);
}

// ─────────────── Submissions ───────────────

/** Approving creates an UNPUBLISHED, UNVERIFIED draft listing: the admin checks it, then publishes. */
export async function approveSubmission(id: string) {
  const admin = await requireAdmin();
  const s = await db.businessSubmission.findUnique({ where: { id } });
  if (!s || s.status !== "PENDING") redirect(`/admin/submissions/${id}`);
  if (!s.cityId) redirect(`/admin/submissions/${id}?error=no-city`);
  const slug = await uniqueSlug("business", s.name);
  const b = await db.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: { slug, name: s.name, description: s.description, category: s.category, cityId: s.cityId!, address: s.address, website: s.website, published: false },
    });
    await tx.businessSubmission.update({ where: { id }, data: { status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date(), businessId: b.id } });
    return b;
  });
  await audit(admin.id, "approve", "BusinessSubmission", id, `-> Business ${b.id}`);
  redirect(`/admin/businesses/${b.id}?from=submission`);
}

export async function rejectSubmission(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const note = String(fd.get("note") ?? "").trim().slice(0, 500) || null;
  await db.businessSubmission.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", reviewNote: note, reviewedById: admin.id, reviewedAt: new Date() } });
  await audit(admin.id, "reject", "BusinessSubmission", id, note ?? undefined);
  redirect("/admin/submissions");
}

export async function deleteSubmission(id: string) {
  const admin = await requireAdmin();
  await db.businessSubmission.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "BusinessSubmission", id);
  redirect("/admin/submissions?status=rejected");
}

// ─────────────── Opportunities ───────────────

export async function saveOpportunity(id: string | null, _: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const p = opportunitySchema.safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  if (p.data.status === "OPEN" && !p.data.lastVerifiedAt)
    return { errors: { lastVerifiedAt: "Check the official source and enter the date you verified it before opening." } };
  let savedId = id;
  try {
    const slug = p.data.slug ?? (await uniqueSlug("opportunity", p.data.title, id ?? undefined));
    const o = id ? await db.opportunity.update({ where: { id }, data: { ...p.data, slug } }) : await db.opportunity.create({ data: { ...p.data, slug } });
    savedId = o.id;
    await audit(admin.id, id ? "update" : "create", "Opportunity", o.id, `${o.title} status=${o.status}`);
  } catch (e) {
    return failed(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/opportunities/${savedId}?saved=1`);
}

export async function closeOpportunity(id: string) {
  const admin = await requireAdmin();
  await db.opportunity.update({ where: { id }, data: { status: "CLOSED" } });
  await audit(admin.id, "close", "Opportunity", id);
  revalidatePath("/", "layout");
}

export async function deleteOpportunity(id: string) {
  const admin = await requireAdmin();
  await db.opportunity.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "Opportunity", id);
  redirect("/admin/opportunities");
}

// ─────────────── Team ───────────────

const strongPassword = z.string().min(12, "At least 12 characters").max(200);

export async function addAdmin(_: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const owner = await requireOwner();
  const p = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().max(160).pipe(z.email()),
    password: strongPassword,
    role: z.enum(["OWNER", "EDITOR"]),
  }).safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  try {
    const a = await db.adminUser.create({ data: { name: p.data.name, email: p.data.email, role: p.data.role, passwordHash: await hashPassword(p.data.password) } });
    await audit(owner.id, "create", "AdminUser", a.id, `${a.email} ${a.role}`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { errors: { email: "An admin with this email already exists" } };
    return failed(e);
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "Admin added." };
}

export async function setAdminActive(id: string, active: boolean) {
  const owner = await requireOwner();
  if (id === owner.id) return; // never lock yourself out
  await db.adminUser.update({ where: { id }, data: { active } });
  await audit(owner.id, active ? "activate" : "deactivate", "AdminUser", id);
  revalidatePath("/admin/team");
}

export async function changeOwnPassword(_: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const me = await requireAdmin();
  const p = z.object({ current: z.string().min(1).max(200), next: strongPassword }).safeParse(formObject(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  if (!(await verifyPassword(p.data.current, me.passwordHash))) return { errors: { current: "Current password is wrong" } };
  await db.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(p.data.next) } });
  await audit(me.id, "change-password", "AdminUser", me.id);
  return { ok: true, message: "Password changed." };
}

export async function deleteSubscriber(id: string) {
  const admin = await requireAdmin();
  await db.subscriber.delete({ where: { id } }).catch(() => null);
  await audit(admin.id, "delete", "Subscriber", id);
  revalidatePath("/admin/subscribers");
}
