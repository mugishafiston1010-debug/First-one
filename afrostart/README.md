# AfroStart Russia

A platform that helps African students prepare for, arrive in and live in Russia: source-linked guides, city pages, a reviewed directory of student services, opportunities, and a preparation checklist — all managed from an admin dashboard.

## Stack and why

| Part | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | One codebase for pages, server logic and admin. Server-rendered pages are fast and SEO-friendly. Same stack as `../web`, so one skill set. |
| Database | **PostgreSQL + Prisma** | Reliable relational data (cities ↔ businesses ↔ guides), typed queries, versioned migrations. Runs on any host, including Russian ones. |
| Styling | **Tailwind CSS 4** with a custom design system (`src/app/globals.css`) | Consistent tokens (brand blue, sun amber, leaf green), no UI-kit lock-in. |
| Fonts | Inter + Plus Jakarta Sans, **self-hosted** via npm (`@fontsource`) | No calls to Google at runtime — works the same from Russia. |
| Auth | Own email + password (bcrypt) with signed HTTP-only cookie (jose) | No external auth provider to depend on or pay for. |
| Validation | **zod** on every server action | Nothing reaches the database unvalidated. |

No paid external service is required. No payments are processed.

## Run it locally

Needs Node.js 20+ and PostgreSQL 14+.

```bash
cd afrostart
cp .env.example .env            # set DATABASE_URL, DIRECT_URL, SESSION_SECRET, IP_HASH_SALT
npm install
npx prisma migrate deploy       # create the tables
npm run db:seed                 # starter categories, cities, universities, guides (see below)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-12-characters' ADMIN_NAME='Your Name' npm run admin:create
npm run dev                     # http://localhost:3000  — admin at /admin
```

### Environment variables

| Name | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection (pooled URL online) |
| `DIRECT_URL` | yes | Direct connection for migrations (same as above locally) |
| `SESSION_SECRET` | yes | ≥ 32 random characters: `openssl rand -base64 48` |
| `IP_HASH_SALT` | yes | Random text; IPs are only stored as salted hashes |
| `NEXT_PUBLIC_SITE_URL` | yes online | Public address, e.g. `https://afrostart.ru` (sitemap, canonical links, Open Graph) |

Never commit `.env`. It is ignored by git.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run |
| `npm test` | Unit tests (status/expiry logic, sponsorship ordering, validation, safe links, checklist storage, i18n) |
| `npm run typecheck` · `npm run lint` | Type and lint checks |
| `npx prisma migrate dev --name <change>` | After editing `prisma/schema.prisma` |
| `npm run admin:create` | Create an owner admin or reset their password |

## First admin account

`npm run admin:create` with `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥ 12 chars) and `ADMIN_NAME` set. It creates an **Owner**, or resets the password if the email exists. Further admins are added in **Admin → Team & account** (Owner or Editor). Owners can deactivate admins; deactivation logs them out immediately.

## Managing content (admin dashboard, `/admin`)

- **Overview** — counts, pending submissions, guides without a verified date, recent activity (every admin action is in the audit log).
- **Guides** — create, edit, publish/unpublish, delete. Set *Information type* (Official / Editorial / Verified provider / Student / Sponsored), *Last verified* date and source links (`Label | https://…`, one per line). Body formatting: blank line = paragraph, `## ` heading, `- ` list, `1. ` list, `**bold**`, `[text](https://…)`.
- **Translations** — create a guide with the same slug and another language. Readers see their language or English with a notice. Only publish reviewed translations.
- **Guide categories** — grouped under the three stages.
- **Cities** — intro, transport, photo (only licensed photos, with credit), universities, local resources.
- **Businesses** — three separate switches: *Published*, *Verified* (you confirmed it is real — never sold), *Team pick* (free). **Sponsored placements** are recorded per period and shown with a “Sponsored” label while active.
- **Submissions** — from the public “List your business” form. Always pending. *Approve* creates an **unpublished, unverified draft** listing to check and complete; *Reject* records a reason; rejected submissions can be deleted.
- **Opportunities** — Draft / Open / Closed. Opening requires a *Last verified* date. After the deadline, an opportunity shows as **Expired automatically** (calculated, never stored).
- **Subscribers** — newsletter list with each person's unsubscribe link. (Sending emails is not built yet; export and send with a mail service, and include the link.)

## About the starter content (seed)

Honest by design: city names/regions, major universities and their official domains, and 8 general editorial guides. **Nothing is marked verified** — the site shows “Not yet verified” until you check each item and set the date. **No businesses are seeded.** The two opportunities are **drafts**: check the official source, fill in eligibility and deadline, then open them. Network access to Russian sites was blocked from the build environment, so no link was checked automatically — please verify each university link.

## Project structure

```
prisma/schema.prisma        data model (cities, universities, guides, sources, categories, businesses,
                            submissions, sponsored placements, opportunities, admins, audit log, subscribers)
prisma/seed.ts              starter content
src/app/(site)/             public pages: /, /guides, /cities, /services, /opportunities, /checklist,
                            /list-your-business, /about, /trust, /privacy, /unsubscribe
src/app/admin/              /admin/login and the protected panel
src/app/actions/            server actions (public forms, auth, admin)
src/lib/queries.ts          public read layer — returns published content only
src/lib/knowledge.ts        knowledge layer for the future AI assistant (see below)
src/lib/validation.ts       all input schemas
src/lib/opportunity-status.ts, sponsorship.ts   business rules (unit-tested)
src/lib/i18n/               en (complete), ru (UI), rw + fr prepared
src/content/checklist.ts    checklist items (stable ids)
```

## Security

- Admin routes: middleware gate + database check on every page and every server action (deactivated admins lose access at once). Owner-only actions are checked server-side.
- Passwords: bcrypt (cost 12); login limited to 5 tries per email / 10 per IP per 15 minutes; same response time for unknown emails.
- Sessions: signed, HTTP-only, `SameSite=Lax`, `Secure` in production, 12-hour lifetime. Server actions have Next.js's built-in origin check (CSRF).
- Public forms: zod validation, honeypot field, rate limits (in memory + database-backed for submissions).
- Content is rendered as React elements, never raw HTML; links must be `http(s)` (blocks `javascript:` links). Security headers set in `next.config.ts`.
- Minimal data: no passports or documents ever; IPs stored only as salted hashes; checklist stays in the browser.

## Languages

English is complete. Russian covers the interface. Kinyarwanda and French are prepared (shown as “soon” in the selector): add `src/lib/i18n/rw.ts`, register it in `src/lib/i18n/index.ts`, set `ready: true` in `config.ts`. Have native speakers review before switching on.

## Future AI assistant

`src/lib/knowledge.ts` → `searchKnowledge(question)` returns published passages with URL, trust level and last-verified date. An assistant should call it, answer **only** from those passages, cite the URLs, warn when a passage is unverified or old, and point to official authorities for legal/immigration questions. Swap the keyword search for pgvector later without changing callers. The checklist uses a `ProgressStore` interface (`src/lib/checklist-store.ts`) so it can move to user accounts later.

## Deployment

Any Node.js host with PostgreSQL works. Build command: `npx prisma migrate deploy && npm run build`; start: `npm start`.

- **Serving users in Russia:** a Russian VPS/cloud (e.g. Timeweb Cloud, Selectel, Yandex Cloud) with managed PostgreSQL gives the best speed and simplest payment from Russia. If you collect personal data of people in Russia (subscriber emails, submission contacts), Russian law 152-FZ applies — get legal advice on data localisation and the privacy policy.
- **Vercel + Neon** (like `../web`) also works and has free tiers; check availability and payment options from Russia.
- The rate limiter is in memory per server instance; add Redis if you run several instances.
- Set `NEXT_PUBLIC_SITE_URL`, a strong `SESSION_SECRET`, daily database backups, and HTTPS.

## Before launch

Verify every seeded item and set its date · replace sample testimonials with real, consented ones · add real contact channels on `/about` · lawyer review of `/privacy` · real photos with licences.
