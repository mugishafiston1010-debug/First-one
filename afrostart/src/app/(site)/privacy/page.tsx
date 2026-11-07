import type { Metadata } from "next";
import { PageHeader } from "@/components/Section";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy", description: "What personal data AfroStart Russia collects and why.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Privacy" title="Privacy" sub="We collect as little personal data as possible." />
      <div className="container-x max-w-3xl py-12">
        <Prose text={`## What we collect
- **Browsing:** no account is needed to read the site. We do not use advertising trackers.
- **Checklist:** your progress is saved only in your own browser (local storage). It is never sent to us.
- **Newsletter:** your email address, your chosen language and the time you agreed. Nothing else.
- **Business submissions:** the business details you submit, and a contact name, email and optional phone so we can review the listing.
- **Spam protection:** a one-way hash of your IP address is stored with submissions to limit abuse. We never store the IP address itself.

## What we never ask for
We never ask for passport scans, visa documents, immigration documents or other sensitive personal documents.

## Your choices
Every newsletter email includes a link to unsubscribe, which deletes your address. To ask about or delete a business submission, contact the AfroStart team.

*This page is a draft and should be reviewed by a legal professional before launch, including for compliance with Russian personal data law (152-FZ) if data is processed in Russia.*`} />
      </div>
    </>
  );
}
