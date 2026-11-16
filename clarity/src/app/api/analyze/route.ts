import { NextResponse } from "next/server";
import { groundAnalysis } from "@/lib/ai/ground";
import { fail, handleError, rateLimited, readBody } from "@/lib/ai/guard";
import { AnalyzeRequest } from "@/lib/ai/schema";
import { analyzeWithClaude, claudeConfigured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!claudeConfigured()) return fail("Claude analysis is not configured on this server.", 503);
  if (rateLimited(req, "analyze", 6)) return fail("Too many analyses in a short time. Wait a minute and try again.", 429);
  const body = await readBody(req, AnalyzeRequest);
  if (body instanceof NextResponse) return body;
  try {
    const model = await analyzeWithClaude(body);
    // Quotes are verified against the text before anything is returned.
    return NextResponse.json({ analysis: groundAnalysis(model, body.blocks) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
