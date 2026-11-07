import { BadgeCheck, Building2, GraduationCap, Megaphone, PenLine, Star, Users } from "lucide-react";
import type { TrustLevel } from "@prisma/client";
import { trustInfo } from "@/lib/labels";

const TRUST_STYLE: Record<TrustLevel, { cls: string; Icon: typeof BadgeCheck }> = {
  OFFICIAL: { cls: "bg-brand-50 text-brand-700 ring-brand-200", Icon: Building2 },
  EDITORIAL: { cls: "bg-slate-50 text-slate-700 ring-slate-200", Icon: PenLine },
  VERIFIED_PROVIDER: { cls: "bg-leaf-50 text-leaf-700 ring-leaf-100", Icon: BadgeCheck },
  STUDENT: { cls: "bg-violet-50 text-violet-700 ring-violet-200", Icon: Users },
  SPONSORED: { cls: "bg-sun-50 text-sun-700 ring-sun-100", Icon: Megaphone },
};

export function TrustBadge({ trust }: { trust: TrustLevel }) {
  const { cls, Icon } = TRUST_STYLE[trust];
  const info = trustInfo(trust);
  return (
    <span className={`chip ring-1 ring-inset ${cls}`} title={info.explain}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {info.label}
    </span>
  );
}

export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span className="chip bg-leaf-50 text-leaf-700 ring-1 ring-inset ring-leaf-100" title="The AfroStart team checked this business is real. Verification is never sold.">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function SponsoredBadge({ label = "Sponsored" }: { label?: string }) {
  return (
    <span className="chip bg-sun-50 text-sun-700 ring-1 ring-inset ring-sun-100" title="This business paid for this placement.">
      <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function FeaturedBadge({ label = "Team pick" }: { label?: string }) {
  return (
    <span className="chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" title="Chosen by the AfroStart team. Not paid.">
      <Star className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function UniBadge() {
  return <GraduationCap className="h-4 w-4" aria-hidden="true" />;
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`chip bg-white text-muted ring-1 ring-inset ring-line ${className}`}>{children}</span>;
}
