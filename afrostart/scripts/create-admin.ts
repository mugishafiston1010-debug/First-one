/**
 * Creates (or resets the password of) an OWNER admin.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-strong-password' ADMIN_NAME='Your Name' npm run admin:create
 * Values come from environment variables so they never end up in the code or shell history files you commit.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Owner";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email.");
  if (password.length < 12) throw new Error("Set ADMIN_PASSWORD to at least 12 characters.");
  const passwordHash = await bcrypt.hash(password, 12);
  const a = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash, active: true, role: "OWNER" },
    create: { email, name, passwordHash, role: "OWNER" },
  });
  console.log(`Owner admin ready: ${a.email}. Sign in at /admin/login`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
