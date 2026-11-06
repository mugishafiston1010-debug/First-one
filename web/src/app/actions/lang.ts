"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang") === "ru" ? "ru" : "en";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  // Remember it on the account so Telegram/WhatsApp messages use the same language.
  const user = await currentUser();
  if (user && user.locale !== lang) await db.user.update({ where: { id: user.id }, data: { locale: lang } });
  revalidatePath("/", "layout");
}
