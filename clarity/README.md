# Clarity

**Don't just understand a document. Know exactly what to do next.**

Clarity turns long, confusing documents (contracts, official letters, policies,
notices) into a plain-language explanation, a task list, a deadline timeline and
a question-and-answer view. Every item links back to the passage it came from.

## Run it

Requires Node.js 20 or newer.

```bash
cd clarity
npm install
npm run dev          # http://localhost:3000
```

That is all you need. With no configuration Clarity runs in **demo mode**:
everything happens in your browser and nothing is uploaded. Click
**Try sample documents** on the home page to explore without a file of your own.

Production build: `npm run build && npm start`.

### Optional: Claude analysis

```bash
cp .env.example .env.local    # then set ANTHROPIC_API_KEY
```

With a key on the server, a second engine ("Claude AI") becomes selectable. It
is opt-in per document and always asks for confirmation before any text leaves
the device. The key is read only on the server and is never sent to the browser.

| Variable            | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Enables the Claude engine. Omit for demo mode.       |
| `CLARITY_MODEL`     | Model id. Defaults to `claude-opus-5-5`.             |

### Checks

```bash
npm test             # unit tests (Vitest)
npm run typecheck
npm run lint
```

## What it does

| Section               | Contents                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| **Understand**        | Purpose, plain-language summary, key information                            |
| **Take action**       | Tasks with deadline, priority, completion status and source                 |
| **Important details** | Consequences not to overlook, documents needed, requirements, conditions    |
| **Simplify**          | Terms the document defines, plus general plain-language explanations        |
| **Ask**               | Questions answered from the document, with the supporting passages          |
| **Deadlines**         | Timeline of dates; star, complete, and export to calendar (`.ics`)          |

The dashboard collects outstanding actions and upcoming deadlines across all
documents. **Actions** and **Deadlines** show them in full; **Privacy & data**
shows what is stored and lets you delete it.

Supported files: PDF, DOCX, TXT and Markdown, up to 25 MB.

## Accuracy model

Every piece of information carries one of three marks:

- **Stated** – taken directly from the document. Open the source to read it in context.
- **Interpretation** – a summary, rewording or general explanation produced by the engine.
- **Needs verification** – ambiguous or unconfirmed, for example a date without
  a year, `03/04/2027` (day-first or month-first?), or a model quote that could
  not be found in the text.

Relative deadlines ("within 30 days of arrival") are kept as written and never
converted into an invented calendar date.

When Claude is used, the server checks every quote it returns against the
document text (`src/lib/ai/ground.ts`). Unmatched items are downgraded to
"needs verification"; an answer whose quotes cannot be found at all is withheld
and replaced by "the document does not provide enough information".

## Privacy

- Files are parsed in the browser (pdf.js, mammoth). The file is never uploaded.
- Documents, analyses, progress and questions are stored in IndexedDB on the
  device. There is no account and no server database.
- Fonts and the PDF worker are bundled, so the app makes no third-party requests.
- The only time content leaves the device is the Claude engine, after an
  explicit confirmation that says what is sent and where.
- Delete a single document from its page, or everything from **Privacy & data**
  (this also erases the local database).

## Architecture

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Vitest.

```
src/
  app/                    pages and API routes
    api/status            is the Claude engine configured? (never returns the key)
    api/analyze, api/ask  validate -> call Claude -> verify quotes -> respond
  components/             Shell, UploadPanel, DocumentView, AskPanel, Timeline, Provenance…
  lib/
    types.ts              data model (Basis, SourceRef, Task, DateItem…)
    text.ts               paragraph blocks, sentence splitting, quote matching
    extract/              PDF / DOCX / TXT / MD text extraction (browser)
    analysis/
      index.ts            the engine interface the UI talks to (local | claude)
      local.ts            on-device rule-based engine
      dates.ts            date and deadline parsing
      glossary.ts         plain-language dictionary
    qa/local.ts           on-device extractive Q&A (BM25)
    ai/                   Claude integration: schema, prompts/client (server-only), grounding
    store/                IndexedDB persistence, React library context, pure mutations
    ics.ts                calendar export
    samples/              sample documents (analysed live, not pre-written)
```

## Limitations

- **Scanned PDFs are not supported.** There is no OCR; Clarity says so instead of
  guessing, and names any pages it could not read in a partly scanned file.
- **The on-device engine is rule-based and tuned for English.** It quotes and
  lightly rewords rather than truly paraphrasing, and can miss unusual phrasing.
  On-device answers are quotes found by keyword matching, not reasoning.
  The Claude engine handles other languages and gives real explanations.
- PDF page numbers are exact. DOCX, TXT and Markdown have no pages, so sources
  are cited by paragraph number (¶).
- Clarity is a reading aid, not legal advice.
