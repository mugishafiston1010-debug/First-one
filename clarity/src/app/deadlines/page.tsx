"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterPills } from "@/components/DocumentView";
import { Page, PageHeader } from "@/components/Shell";
import { ExportButton, Timeline } from "@/components/Timeline";
import { EmptyState, Skeleton } from "@/components/ui";
import { allDates } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";

type Filter = "upcoming" | "deadlines" | "starred" | "all";

export default function DeadlinesPage() {
  const { docs, ready } = useLibrary();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const entries = allDates(docs);
  const upcoming = entries.filter((e) => !e.date.done && (e.inDays === undefined || e.inDays >= 0 || e.date.kind === "deadline"));
  const deadlines = entries.filter((e) => e.date.kind === "deadline");
  const starred = entries.filter((e) => e.date.starred);
  const shown = { upcoming, deadlines, starred, all: entries }[filter];

  return (
    <Page width="max-w-3xl">
      <PageHeader eyebrow="Across all documents" title="Deadlines">
        Every date found in your documents on one timeline. Star what matters, tick off what is done, and export it to your calendar.
      </PageHeader>

      {!ready ? (
        <Skeleton className="mt-10 h-72" />
      ) : entries.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon="calendar"
            title="No dates yet"
            action={
              <Link href="/" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">
                Add a document
              </Link>
            }
          >
            Dates and deadlines from your documents will be collected here.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterPills
              value={filter}
              onChange={setFilter}
              options={[
                { id: "upcoming", label: `Upcoming ${upcoming.length}` },
                { id: "deadlines", label: `Deadlines ${deadlines.length}` },
                { id: "starred", label: `Important ${starred.length}` },
                { id: "all", label: `All ${entries.length}` },
              ]}
            />
            <ExportButton entries={shown} filename="Clarity deadlines" />
          </div>
          <div className="mt-9">
            {shown.length ? (
              <Timeline entries={shown} showDocument />
            ) : (
              <p className="py-10 text-center text-sm text-ink-3">{filter === "starred" ? "Nothing starred yet. Use the star on any date to mark it as important." : "Nothing matches this filter."}</p>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
