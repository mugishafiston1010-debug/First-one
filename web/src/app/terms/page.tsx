import { BRAND } from "@/lib/brand";

export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <article className="card mx-auto max-w-2xl space-y-3 text-sm leading-relaxed">
      <h1 className="h2">Terms of service</h1>
      <p className="notice">Draft. Must be reviewed by a lawyer before launch.</p>
      <p>1. {BRAND} helps you send money between Russia and Rwanda. You see the fee, our rate margin and the amount the recipient gets before you pay.</p>
      <p>2. You must be 18 or older, use your own name, and send only your own money. We may ask you to verify your identity and the source of funds.</p>
      <p>3. A price is held for 15 minutes. An order must be paid within 30 minutes, in one transfer of the exact amount, to the account shown in that order only.</p>
      <p>4. We pay out after your payment is confirmed. If we cannot pay out, we return the full amount, including the fee.</p>
      <p>5. We may refuse, hold or cancel a transfer if we suspect fraud, money laundering, or breach of these terms, and may report it where the law requires.</p>
      <p>6. Check the recipient details carefully. If money is paid to the details you gave, we are not responsible if they were wrong.</p>
      <p>7. Contact support on WhatsApp or Telegram with your order number for any problem.</p>
    </article>
  );
}
