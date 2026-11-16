import { NextResponse } from "next/server";
import { groundAnswer } from "@/lib/ai/ground";
import { fail, handleError, rateLimited, readBody } from "@/lib/ai/guard";
import { AskRequest } from "@/lib/ai/schema";
import { askClaude, claudeConfigured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!claudeConfigured()) return fail("Claude is not configured on this server.", 503);
  if (rateLimited(req, "ask", 20)) return fail("Too many questions in a short time. Wait a minute and try again.", 429);
  const body = await readBody(req, AskRequest);
  if (body instanceof NextResponse) return body;
  try {
    const model = await askClaude(body);
    return NextResponse.json({ answer: groundAnswer(model, body.blocks) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
