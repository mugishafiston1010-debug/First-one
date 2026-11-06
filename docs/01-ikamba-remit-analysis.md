# Ikamba Remit: full analysis of the reference site

Analysed on 2026-11-06 from https://www.ikambaremit.com (app version 6.9.122).
Sources: the public pages rendered in a browser, robots.txt, sitemap.xml, manifest.json and all 182 JavaScript files the site serves.
The pages behind login (dashboard, send, wallet…) were studied from their code and from the user's screenshots, not from a logged-in session.

---

## 1. What the business is

- **Who it serves:** Africans living in Russia (and Turkey) sending money home, plus the reverse direction (Rwanda / Uganda / Kenya to Russia).
- **Founded:** 2024. Contacts: team@ikambaventures.com, WhatsApp +7 999 552-24-18, Telegram @ikambaremit, an office in Moscow (Miklukho-Maklaya 13) for cash, "Kigali Financial Center" as address.
- **What they say about themselves:** 10,000+ customers, $5M+ moved, "3,000+ transfers since Aug 2026", 19 currencies, four languages (EN, FR, RU, PT).

### How the money really moves (the core of the model)
This is **not a licensed bank-to-bank transfer**. It is a **P2P / agent (hawala-style) model**:

1. The customer gets a quote (rate + fee) and creates an order.
2. The app shows a **Sber card number of a "Card Agent"** (a private person). The card is picked from a **rotation queue** (`/api/rotation/get-card`, `arrange`, `set-amount`) so that no one card gets too much money.
3. The customer pays that card by bank transfer / SBP and **uploads a screenshot of the receipt**.
4. **AI reads the receipt** (`/api/ai/proof-scan`): checks amount, recipient name, date, and whether the receipt was already used. If it is unclear, a person checks it.
5. An operator / agent in Africa **pays out from their own float** to MTN MoMo, Airtel Money, M-Pesa or a bank account, and uploads proof of payout.
6. The order is marked delivered; the customer sees the proof.

Anyone can apply to be a **Card Agent** (`/card-agent/apply`): they give their Sber card, admins approve them, and the card joins the rotation.
Internally there is a **ledger per cardholder** (how much each card received and owes), with reconciliation tools.

> Important: in Russia, accepting money for others on personal cards and passing it abroad without a licence falls under 115-FZ (anti-money-laundering) and the rules on unlicensed payment services. Banks block such cards often ("Sber payments are temporarily unavailable" is in their code for this reason). If you build your own, this is the first decision to make properly (see section 7).

---

## 2. Technology

| Part | What they use |
|---|---|
| Front end | React SPA built with Vite, Tailwind + Radix/shadcn UI parts, react-hook-form + Zod, i18next (EN/FR/RU/PT), Recharts |
| Hosting | Vercel (static site) |
| Back end | Firebase: Auth (email + Google), Firestore (database), Storage (receipts, passports), Cloud Functions (`us-central1-ikamba-1c669.cloudfunctions.net/api`, an Express-style API) |
| Face scan | Google MediaPipe in the browser (`vision_wasm`) for the liveness check (turn head left/right) |
| AI | LLM calls for: reading receipts, filling an order from a text message ("Send with AI"), drafting WhatsApp messages, matching cardholders, reviewing finished orders |
| Messages | WhatsApp (order updates, reminders), email |
| PWA | Installable on phone (manifest, service worker), "Send money" shortcut |
| SEO | Good: schema.org markup, Open Graph, sitemap, a page per corridor (`/send-money-from-russia-to-rwanda`), AI search bots allowed |

Weak points in the tech: one huge front-end (182 files, 5 MB of JS, a 15-second "loading" screen with reload button), a lot of "legacy" admin pages, much logic in the browser, and a home-made cache buster because deploys break old cached files.

---

## 3. Every page

### Public
| Route | Content |
|---|---|
| `/` | Story ("When the big companies left Russia… we filled the gap"), live calculator (you send / recipient gets, fee ₽100, rate), today's rates for 6 countries, 5-step "how a transfer works" with an animated example, 19 currencies, partners (Sber, MTN MoMo, Airtel, Wave, Orange Money), FAQ, WhatsApp/Telegram/email |
| `/how-it-works` | 4 steps: sign up, KYC, amount and recipient, delivery |
| `/pricing` | From RUB: fixed ₽100 + "low variable %"; from TRY: % only; payout free. Table of corridors |
| `/faq` | General, payments and fees, security, delivery |
| `/about` | Mission, numbers, "256-bit SSL, KYC, 2FA" |
| `/contact` | Email, WhatsApp, address, contact form |
| `/privacy` (= `/terms` = `/compliance`, same page) | Privacy policy only. **There are no real terms of service** |
| `/send-money-from-russia-to-rwanda` | SEO landing page for one corridor |
| `/signin`, `/signup`, `/forgot-password`, `/verify-email` | Email + password or Google |

### Customer (after login)
| Route | What it does |
|---|---|
| `/dashboard` | Wallet card (0 RUB, "tap to add money"), Send money, recent transfers with status (Delivered…), today's rate box with currency chips, frequent recipient, **"Send with AI"** chat box, "Verify your identity" banner, quick links (Free VPN, Recipients, Wallet, History) |
| `/send` | Main send flow (below) |
| `/transactions/:id` | One order: status timeline, receipt, proof of payout |
| `/history` | All transfers |
| `/recipients` | Saved recipients (name, MoMo/M-Pesa number, bank) |
| `/wallet` | Balances per currency, deposit, withdraw to own MoMo/bank, send to another Ikamba wallet by address `IK-RUB-XXXX-XXXX` (instant, cannot be reversed) |
| `/my-deposits` | Wallet top-ups |
| `/bars` | Loyalty points ("Bars"): welcome bonus, cashback per transfer, bonus for feedback, use as discount, send to a friend |
| `/automations` | Recurring transfers paid from the wallet: daily, weekly days, monthly, every two months, at a set time and timezone |
| `/kyc` | Passport photo (read automatically, MRZ lines), date of birth (18+), Russian +7 phone used for SBP, face scan with head turns; a person checks if the machine is unsure |
| `/settings` | Profile, photo, default currency, notifications, hide balance |
| `/feedback` | Feedback form (gives Bars) |
| `/card-agent/apply` | Become a Card Agent |
| `/suspended` | Shown to blocked accounts |
| Free VPN | Link to a VPN offer (they track clicks) |

### The send flow (`/send`)
1. Amount and currencies; live rate is checked again before the order ("Exchange rates moved since your quote").
2. Country, then delivery method (mobile money / bank / Sber card / SBP phone / UPI for India), provider, recipient name and number, with number checks per country (e.g. Tanzania prefixes).
3. Ask for the user's WhatsApp number for updates.
4. Choose how to pay: **bank card transfer to an agent card**, **cash** at the Moscow office (with a cash discount), **wallet balance**, or **Bars**.
5. Payment page: card number, holder name, amount rounded to a clean number, copy buttons, step-by-step instructions.
6. Upload receipt (PNG/JPG/PDF up to 10 MB). AI checks it in seconds.
7. Done screen: "What happens next", feedback.
Also: several orders paid with one transfer ("One payment for your N orders"), protection against duplicate orders ("Same transfer already pending", "Too many open transfers").

Order statuses: `pending_payment` → `awaiting_confirmation` / `proof_uploaded` → `processing` → `delivered` / `completed`, plus `cancelled`, `rejected`, `failed`, `refunded`.

### Admin (`/admin/*`, ~55 pages)
Orders and review, find transaction, transaction trace, KYC queue, users, card agents and cardholders (review, ledger, currency), card rotation, rates and **rate engine**, currency pairs, delivery options, payment methods, wallets overview and control, withdrawals, deposit orders, Bars, automations, alerts, observability, AI usage and "ask AI", WhatsApp, email, OTP support, feedback, version control, VPN clicks.

---

## 4. Fees and rates (what is visible)

- RUB → anything: **₽100 fixed + a percentage** (the % is not published; it is shown only in the calculator).
- TRY → anything: percentage only.
- Payout: free.
- Their rate: on 6 Nov 2026, 1 RUB = 16.0786 RWF. They call it "real / mid-market", but their margin is inside the rate (the rate engine sets it).
- Cash at the office gets a discount; Bars can pay part or all of the fee/amount.

---

## 5. What they do well (keep this level or better)

1. Rate and fee shown before paying; rate locked during the order.
2. AI reading of the receipt, so most orders are checked in seconds.
3. "Send with AI": type one sentence, the order is filled in.
4. Fast KYC in the browser (passport + face scan).
5. WhatsApp as the main support and update channel — this is what the community uses.
6. Clear order timeline with proof of payout.
7. Wallet, recurring transfers, loyalty points.
8. SEO and per-corridor landing pages; four languages.

## 6. Weak points (where yours can be better)

1. **Legal base**: P2P personal cards; risk of blocked cards and of the service being stopped. No terms of service page; `/terms` shows the privacy policy. Office address claims ("Kigali Financial Center") are vague.
2. **Trust**: no company registration number, licence or partner bank named. Numbers on the site disagree (10,000 customers / 3,000 transfers since Aug 2026 / "thousands").
3. **The percentage fee is hidden** until you start; the rate margin is not shown next to the official rate.
4. **Manual steps**: the user must leave the app, pay in the bank app, take a screenshot, come back and upload it. Most of the delay and errors come from here.
5. **Speed of the site**: very heavy front end, slow first load on weak mobile internet.
6. **Russian language**: offered, but the site and screenshots are English-first, while customers pay with Russian banks.
7. **Mixed design**: two different visual styles (old marketing pages vs. new home), English-only meta, extra items like "Free VPN" in the money app.
8. **No real-time status from the payout** (no direct API to MTN/M-Pesa: an agent pays and uploads proof).

## 7. Decisions to make before building yours

1. **How money enters in Russia** (the most important):
   - a) P2P agent cards like Ikamba (fast to start, legally and bank-risky), or
   - b) Partner with a licensed Russian payment company / bank that accepts payments via SBP and has a payout partner in Africa (slower to start, but can grow and will not be blocked), or
   - c) Crypto rail (USDT) between agents — also a legal grey zone in Russia.
2. **How money leaves in Rwanda/Africa**: your own agents with float, or an aggregator API (e.g. MTN MoMo API, Flutterwave, Onafriq, Thunes) for automatic payout and real-time status.
3. **First corridors**: start with RUB → RWF and RWF → RUB only, then add UGX, KES, BIF.
4. **Tech stack** (my recommendation): Next.js + TypeScript front end, PostgreSQL with a proper double-entry ledger, a typed back end (NestJS or Next.js server actions), object storage for receipts, a queue for jobs, Telegram + WhatsApp bots. A real database with a ledger is safer for money than Firestore.
