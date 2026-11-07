import { Fragment } from "react";
import { safeHttpUrl } from "@/lib/safe-url";

/**
 * Renders the small Markdown subset used in guides: "## " / "### " headings, "- " lists, "1. " lists,
 * paragraphs, **bold** and [links](https://...). Builds React elements (never raw HTML), so content cannot inject scripts.
 */
export function Prose({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={`space-y-4 text-[15.5px] leading-7 text-slate-700 ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const first = lines[0];
        if (first.startsWith("### ")) return <h3 key={i} className="pt-2 text-lg font-bold text-ink">{inline(first.slice(4))}</h3>;
        if (first.startsWith("## ")) return <h2 key={i} className="pt-4 text-xl font-bold text-ink sm:text-2xl">{inline(first.slice(3))}</h2>;
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>)}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+[.)] /.test(l)))
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand-600">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)] /, ""))}</li>)}
            </ol>
          );
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index} className="font-semibold text-ink">{m[1]}</strong>);
    else {
      const href = m[3].startsWith("/") && !m[3].startsWith("//") ? m[3] : safeHttpUrl(m[3]);
      out.push(
        href ? (
          <a key={m.index} href={href} className="font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" {...(href.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
            {m[2]}
          </a>
        ) : (
          m[2]
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
