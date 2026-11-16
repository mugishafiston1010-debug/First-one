/** Small in-memory rate limiter and request helpers for the AI routes. */
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AiError } from "./server";
import { MAX_DOCUMENT_CHARS } from "./schema";

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, key: string, max: number): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(id, recent);
    return true;
  }
  recent.push(now);
  hits.set(id, recent);
  return false;
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readBody<T extends { blocks: Array<{ text: string }> }>(req: Request, schema: ZodType<T>): Promise<T | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail("The request was not valid JSON.", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail("The request was missing required fields or was malformed.", 400);
  const chars = parsed.data.blocks.reduce((n, b) => n + b.text.length, 0);
  if (chars > MAX_DOCUMENT_CHARS) {
    // Never truncate silently: the reader would get an analysis of part of the document.
    return fail(`This document is too long for cloud analysis (${chars.toLocaleString("en")} characters; the limit is ${MAX_DOCUMENT_CHARS.toLocaleString("en")}). Use the on-device engine instead.`, 413);
  }
  return parsed.data;
}

export function handleError(err: unknown) {
  if (err instanceof AiError) return fail(err.message, err.status);
  console.error("[clarity] unexpected AI route error", err instanceof Error ? err.message : err);
  return fail("Something went wrong while contacting Claude.", 500);
}
