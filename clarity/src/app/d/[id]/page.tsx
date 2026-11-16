"use client";

import Link from "next/link";
import { use } from "react";
import { Suspense } from "react";
import { DocumentView } from "@/components/DocumentView";
import { Page } from "@/components/Shell";
import { EmptyState, Skeleton } from "@/components/ui";
import { useLibrary } from "@/lib/store/library";

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { docs, ready } = useLibrary();
  const doc = docs.find((d) => d.id === decodeURIComponent(id));

  if (!ready) {
    return (
      <Page>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-10 h-64" />
      </Page>
    );
  }
  if (!doc) {
    return (
      <Page>
        <EmptyState
          icon="doc"
          title="Document not found"
          action={
            <Link href="/" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">
              Back to your documents
            </Link>
          }
        >
          It may have been deleted, or it was added in a different browser. Documents are stored only on the device where they were added.
        </EmptyState>
      </Page>
    );
  }
  return (
    <Suspense>
      <DocumentView doc={doc} />
    </Suspense>
  );
}
