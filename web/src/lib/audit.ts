import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function audit(actorId: string | null, action: string, target?: string, data?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, target, data } });
}
