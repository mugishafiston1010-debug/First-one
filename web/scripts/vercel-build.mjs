// Build on Vercel. Works with the database Vercel creates for you (Neon), whatever its variable names,
// and still builds before a database is connected (so the first deploy does not fail).
import { execSync } from "node:child_process";

const env = { ...process.env };
env.DATABASE_URL ||= env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || "";
env.DIRECT_URL ||= env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;

const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

run("npx prisma generate");
if (env.DATABASE_URL) {
  run("npx prisma migrate deploy");
} else {
  console.warn("\n⚠  No database connected yet. Skipping table setup. Connect a database in Vercel → Storage, then Redeploy.\n");
}
run("npx next build");
