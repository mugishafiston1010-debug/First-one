"use client";

import { Button, Dialog } from "./ui";

/** Shown every time a document is about to leave the device for the first time. */
export function CloudConsentDialog({
  open,
  name,
  chars,
  model,
  purpose,
  onCancel,
  onLocal,
  onConfirm,
}: {
  open: boolean;
  name: string;
  chars: number;
  model: string | null;
  purpose: "analyse" | "ask";
  onCancel: () => void;
  onLocal?: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Send this document to Claude?"
      footer={
        <>
          {onLocal ? (
            <Button onClick={onLocal} icon="device">
              Keep it on this device
            </Button>
          ) : (
            <Button onClick={onCancel}>Cancel</Button>
          )}
          <Button variant="primary" icon="cloud" onClick={onConfirm} data-testid="consent-confirm">
            Send and {purpose === "analyse" ? "analyse" : "ask"}
          </Button>
        </>
      }
    >
      <p>
        To {purpose === "analyse" ? "analyse" : "answer questions about"} <strong className="font-medium text-ink">{name}</strong> with Claude, its full extracted text
        ({chars.toLocaleString("en")} characters) will leave this device.
      </p>
      <ul className="mt-3 space-y-1.5 text-[13px]">
        <li>• It is sent to this app&rsquo;s server, which forwards it to Anthropic&rsquo;s API{model ? ` (${model})` : ""}.</li>
        <li>• This app&rsquo;s server does not store it. Anthropic handles it under its own data-retention policy.</li>
        <li>• The original file itself is not uploaded, only the text read from it.</li>
        <li>• Later questions about this document are sent the same way.</li>
      </ul>
      <p className="mt-3 text-[13px]">If the document is sensitive, keep it on this device instead.</p>
    </Dialog>
  );
}
