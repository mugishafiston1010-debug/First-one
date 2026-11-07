import "server-only";
import { db } from "./db";

export async function audit(adminId: string, action: string, entity: string, entityId?: string, detail?: string) {
  await db.auditLog.create({ data: { adminId, action, entity, entityId, detail } });
}
