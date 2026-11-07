import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/Section";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "About", description: "AfroStart Russia helps African students prepare for, arrive in and navigate life in Russia.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="Making the move to Russia easier" sub="Information about studying in Russia is scattered across group chats, websites and word of mouth. AfroStart brings the useful, checked parts together." />
      <div className="container-x max-w-3xl py-12">
        <Prose text={`## Our mission
Make the transition to studying and living in Russia easier for African students through technology, reliable information and useful local connections.

## Who we serve
- **Prospective students** in African countries preparing to study in Russia.
- **Current students** already living in Russia who need local services and practical guides.
- **Businesses** that offer genuinely useful services to students.

We are starting with Rwandan students and growing to serve students from across Africa.

## What we promise
- Information is linked to its source and shows when we last checked it.
- Businesses are reviewed before they appear.
- Sponsored content is always labelled. Verification is never sold.
- Student information stays free.

## Contact
To report outdated information or a problem with a listing, or to partner with us, contact the AfroStart team through the channels listed on this page once they are announced.`} />
        <p className="mt-8 text-sm"><Link href="/trust" className="font-semibold text-brand-600 underline">How we check information →</Link></p>
      </div>
    </>
  );
}
