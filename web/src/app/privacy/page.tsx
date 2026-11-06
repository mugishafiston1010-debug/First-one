import { BRAND } from "@/lib/brand";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="card mx-auto max-w-2xl space-y-3 text-sm leading-relaxed">
      <h1 className="h2">Privacy policy</h1>
      <p className="notice">Draft. Must be reviewed by a lawyer before launch (Russian law 152-FZ applies to personal data of people in Russia).</p>
      <p>{BRAND} collects: your name, email, phone, identity documents and selfie, recipient details, transfer amounts and receipts.</p>
      <p>We use them to make transfers, check identity, prevent fraud and meet legal duties. We do not sell them.</p>
      <p>Documents and receipts are stored privately and are only visible to you and our compliance staff.</p>
      <p>Transfer records are kept for at least 5 years. You can ask for a copy of your data or its deletion where the law allows.</p>
    </article>
  );
}
