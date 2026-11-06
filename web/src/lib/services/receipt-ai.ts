import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { readStoredFile } from "../storage";
import { checkReceipt, type ReceiptData } from "../receipt-rules";

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const ReceiptSchema = z.object({
  is_payment_receipt: z.boolean().describe("true only for a bank/mobile-money transfer confirmation or receipt"),
  status: z.enum(["success", "pending", "failed", "unknown"]),
  amount: z.number().nullable().describe("Amount sent, without the bank's own commission if shown separately"),
  currency: z.string().nullable().describe("ISO code, e.g. RUB, RWF"),
  paid_at: z
    .string()
    .nullable()
    .describe("Date and time of the payment in ISO 8601. Add the UTC offset only if the receipt shows the time zone (Russian banks: Moscow +03:00)."),
  recipient_name: z.string().nullable().describe("Name of the person who received the money, exactly as printed"),
  recipient_account_digits: z.string().nullable().describe("Visible digits of the recipient's card, phone or account (e.g. last 4)"),
  bank: z.string().nullable(),
  transaction_id: z.string().nullable().describe("Operation / transaction / receipt number"),
  looks_edited: z.boolean().describe("true if fonts, alignment or numbers look altered"),
});

const PROMPT = `You read payment receipts (screenshots or PDFs from Russian banks like Sberbank, T-Bank, VTB, Alfa, or from MTN MoMo / Airtel Money in Rwanda) for a money transfer service.
Extract the fields exactly as shown. If a field is not visible, return null — never guess.
Receipts may be in Russian, English, French or Kinyarwanda. Return names in the original spelling.`;

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

/** Ask Claude to read the receipt file. Returns null if the model declined or output could not be parsed. */
export async function readReceipt(file: { path: string; mimeType: string; data?: Uint8Array | null }): Promise<ReceiptData | null> {
  const buf = await readStoredFile(file);
  const data = buf.toString("base64");
  const media =
    file.mimeType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: file.mimeType as "image/jpeg" | "image/png" | "image/webp", data },
        } as const);

  const response = await anthropic().beta.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(ReceiptSchema) },
      // If the main model declines, the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: [media, { type: "text", text: PROMPT }] }],
    },
    { timeout: 60_000 },
  );
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}

/**
 * Run the AI check for an order's receipt and save the verdict.
 * Duplicate files and reused transaction IDs are caught here too.
 * Never changes the order status: an admin always confirms the money.
 */
export async function runReceiptCheck(orderId: string): Promise<{ verdict: string; reasons: string[] }> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payInAccount: true } });
  if (!order.receiptFileId) return { verdict: "ERROR", reasons: ["No receipt"] };
  const file = await db.storedFile.findUniqueOrThrow({ where: { id: order.receiptFileId } });

  const save = async (verdict: string, reasons: string[], data?: ReceiptData | null, txn?: string | null) => {
    await db.order.update({
      where: { id: orderId },
      data: {
        aiVerdict: verdict,
        aiReasons: reasons,
        aiData: (data ?? undefined) as Prisma.InputJsonValue | undefined,
        aiCheckedAt: new Date(),
        receiptTxnId: txn ?? undefined,
      },
    });
    return { verdict, reasons };
  };

  // 1. Same file already used on another order? (works even without AI)
  if (file.sha256) {
    const sameFiles = await db.storedFile.findMany({ where: { sha256: file.sha256, id: { not: file.id } }, select: { id: true } });
    const dup = sameFiles.length
      ? await db.order.findFirst({ where: { id: { not: orderId }, receiptFileId: { in: sameFiles.map((f) => f.id) } }, select: { ref: true } })
      : null;
    if (dup) return save("FAIL", [`The same receipt file was already used for order ${dup.ref}`]);
  }

  if (!aiEnabled()) return save("REVIEW", ["AI check is off (no ANTHROPIC_API_KEY). Check by hand."]);
  if (file.mimeType === "image/heic") return save("REVIEW", ["HEIC photo: AI cannot read this format. Check by hand."]);

  let data: ReceiptData | null;
  try {
    data = await readReceipt(file);
  } catch (e) {
    console.error("AI receipt read failed", e);
    return save("ERROR", ["AI could not read the receipt right now. Check by hand."]);
  }
  if (!data) return save("ERROR", ["AI could not read the receipt. Check by hand."]);

  const txn = data.transaction_id?.replace(/\s+/g, "") || null;
  const txnIdUsedElsewhere = txn ? !!(await db.order.findFirst({ where: { receiptTxnId: txn, id: { not: orderId } } })) : false;
  const check = checkReceipt(data, {
    totalToPay: order.totalToPay.toString(),
    currency: order.fromCurrency,
    createdAt: order.createdAt,
    payInHolder: order.payInAccount.holderName,
    payInNumber: order.payInAccount.accountNumber,
    txnIdUsedElsewhere,
  });
  return save(check.verdict, check.reasons, data, txn);
}
