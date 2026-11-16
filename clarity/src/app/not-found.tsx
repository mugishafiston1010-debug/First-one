import Link from "next/link";
import { Page } from "@/components/Shell";

export default function NotFound() {
  return (
    <Page>
      <p className="eyebrow">Not found</p>
      <h1 className="font-display mt-2 text-[38px] leading-tight">This page does not exist.</h1>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">
        Back to your documents
      </Link>
    </Page>
  );
}
