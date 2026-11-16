import { NextResponse } from "next/server";
import { claudeConfigured, claudeModel } from "@/lib/ai/server";

export const dynamic = "force-dynamic";

/** Tells the browser whether the optional cloud engine exists. Never returns the key. */
export function GET() {
  const configured = claudeConfigured();
  return NextResponse.json(
    { claude: configured, model: configured ? claudeModel() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
