import { whatsappLink } from "@/lib/brand";

export default function Suspended() {
  return (
    <div className="mx-auto max-w-md card space-y-3 text-center">
      <h1 className="h2">Account on hold</h1>
      <p className="text-muted">Your account is temporarily on hold. Please contact support to resolve it.</p>
      <a className="btn-primary" href={whatsappLink("My account is on hold")}>WhatsApp support</a>
    </div>
  );
}
