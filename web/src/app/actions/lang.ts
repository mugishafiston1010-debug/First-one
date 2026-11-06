"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang") === "ru" ? "ru" : "en";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  revalidatePath("/", "layout");
}
