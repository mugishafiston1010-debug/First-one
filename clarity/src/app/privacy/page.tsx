"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Page, PageHeader } from "@/components/Shell";
import { Button, Card, Dialog, Icon, useToast } from "@/components/ui";
import { formatDate } from "@/lib/analysis/dates";
import { useLibrary } from "@/lib/store/library";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function PrivacyPage() {
  const { docs, ready, status, remove, removeAll } = useLibrary();
  const toast = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage(e.usage ?? null)).catch(() => setUsage(null));
  }, [docs.length]);

  const sentToCloud = docs.filter((d) => d.cloudConsent);

  return (
    <Page width="max-w-3xl">
      <PageHeader eyebrow="Your data" title="Privacy & data">
        Where your documents are, when anything leaves this device, and how to delete it.
      </PageHeader>

      <div className="stagger mt-9 space-y-5">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-bg">
              <Icon name="device" size={18} />
            </span>
            <div>
              <h2 className="font-display text-[21px] leading-tight">Processed on this device by default</h2>
              <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
                <li>Files are opened and their text is extracted inside your browser. The file is never uploaded.</li>
                <li>The on-device engine finds tasks, dates and terms without any network request.</li>
                <li>Documents, analyses, task progress and questions are stored in this browser only (IndexedDB). There is no account and no server database.</li>
                <li>Fonts and the PDF reader are bundled with the app, so no third-party service sees your activity.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${status.claude ? "bg-accent text-on-accent" : "bg-sunken text-ink-2"}`}>
              <Icon name="cloud" size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[21px] leading-tight">Claude AI: {status.claude ? "available, opt-in per document" : "not configured"}</h2>
              {status.claude ? (
                <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
                  <li>
                    Only when you choose &ldquo;Claude AI&rdquo; and confirm, the document&rsquo;s extracted text is sent to this app&rsquo;s server and forwarded to Anthropic&rsquo;s API{status.model ? ` (model ${status.model})` : ""}.
                  </li>
                  <li>The server does not store documents. The API key stays on the server and is never sent to your browser.</li>
                  <li>Every answer and citation from Claude is checked against your document&rsquo;s text before it is shown.</li>
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-ink-2">
                  This installation runs in demo mode: no API key is set on the server, so nothing can be sent to an external AI service. Everything works on-device. To enable Claude, the person running the app sets{" "}
                  <code className="rounded bg-sunken px-1.5 py-0.5 text-[12.5px]">ANTHROPIC_API_KEY</code> on the server.
                </p>
              )}
              {sentToCloud.length > 0 && (
                <p className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
                  {sentToCloud.length} document{sentToCloud.length === 1 ? " has" : "s have"} been sent to Claude with your confirmation: {sentToCloud.map((d) => d.name).join(", ")}.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[21px] leading-tight">Stored on this device</h2>
              <p className="mt-1 text-[13px] text-ink-2">
                {ready ? `${docs.length} document${docs.length === 1 ? "" : "s"}` : "Loading…"}
                {usage !== null && ` · about ${formatBytes(usage)} used by this site`}
              </p>
            </div>
            <Button variant="danger" icon="trash" disabled={!docs.length} onClick={() => setConfirmAll(true)} data-testid="delete-all">
              Delete everything
            </Button>
          </div>

          {ready && docs.length === 0 ? (
            <p className="mt-5 rounded-xl bg-sunken/60 px-4 py-5 text-center text-[13px] text-ink-3">Nothing is stored. This browser holds no document data from Clarity.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <Icon name="doc" size={16} className="text-ink-3" />
                  <Link href={`/d/${d.id}`} className="min-w-0 flex-1 hover:text-accent-ink">
                    <span className="block truncate text-[14px] font-medium">{d.name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {formatBytes(d.charCount)} of text · added {formatDate(d.addedAt.slice(0, 10))} · {d.cloudConsent ? "sent to Claude" : "never left this device"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={async () => {
                      await remove(d.id);
                      toast("Document deleted from this device");
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-sunken hover:text-accent-ink"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="px-1 text-[12.5px] leading-relaxed text-ink-3">
          Clarity helps you read and organise documents. It can miss things or misread them, which is why every item links to its source. For decisions with legal or financial consequences, read the original and ask a qualified person.
        </p>
      </div>

      <Dialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Delete everything?"
        footer={
          <>
            <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button
              variant="danger"
              icon="trash"
              data-testid="confirm-delete-all"
              onClick={async () => {
                await removeAll();
                setConfirmAll(false);
                toast("All Clarity data was deleted from this device");
              }}
            >
              Delete all data
            </Button>
          </>
        }
      >
        <p>
          All {docs.length} document{docs.length === 1 ? "" : "s"}, their extracted text, analyses, task progress and questions will be permanently removed from this browser, and the local database will be erased.
        </p>
      </Dialog>
    </Page>
  );
}
