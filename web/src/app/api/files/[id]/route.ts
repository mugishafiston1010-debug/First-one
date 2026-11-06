import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

/** Files are private: only the owner, or an admin, can open them. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const file = await db.storedFile.findUnique({ where: { id } });
  if (!file) return new NextResponse("Not found", { status: 404 });
  let allowed = user.role === "ADMIN" || file.ownerId === user.id;
  if (!allowed && file.kind === "payout_proof") {
    // The customer may see the payout proof attached to their own order.
    allowed = !!(await db.order.findFirst({ where: { payoutProofFileId: file.id, userId: user.id } }));
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });
  const body = await readUpload(file.path);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
