# Inzira — money transfers Russia ⇄ Rwanda

"Inzira" is a placeholder name. Change it with `NEXT_PUBLIC_BRAND` in `.env`.

## Run it on your computer

Needs Node.js 20+ and PostgreSQL 14+.

```bash
cd web
cp .env.example .env          # then set DATABASE_URL and a long random SESSION_SECRET
npm install
npx prisma migrate deploy     # creates the tables
ADMIN_EMAIL=you@mail.com ADMIN_PASSWORD='a-strong-password' npm run db:seed
npm run dev                   # http://localhost:3000
```

Checks: `npm test` (money, statuses, card rotation, ledger, number checks) · `npm run typecheck` · `npm run build`.

## How a transfer works

1. **Price.** The customer types an amount. The calculator shows the fee, the rate margin in money, our rate next to the market rate, and the exact amount the recipient gets. The browser and the server use the same code (`src/lib/money.ts`), so the shown price is always the charged price.
2. **Quote.** On "Continue" the server saves a quote that is held for 15 minutes.
3. **Order.** When the customer confirms, the server checks the 30-day limit (lower without identity check), the number of open orders, and picks a **pay-in account** (an agent card, SBP phone or MoMo number). It picks the active account that has used the smallest share of its daily limit and still has room (`src/lib/rotation.ts`). A database lock stops two orders from overfilling the same card.
4. **Payment.** The customer has 30 minutes to pay the exact amount and upload the receipt. The file type is checked from its real bytes, not its name.
5. **Admin confirms** only after seeing the money on the account. The ledger records the money in, our fee, and the currency exchange.
6. **Admin pays out** and marks the order delivered with the transaction ID and/or a screenshot. The customer sees it with the proof.

Order statuses and who may change them: `src/lib/order-state.ts`.
Every status change is saved in the order history, and every admin action goes to the audit log.

## Ledger

Double-entry bookkeeping: every movement is written twice (money in and where it went), and each currency must sum to zero. `/admin/ledger` shows the balances and turns red if anything does not balance.

| Account | Meaning |
|---|---|
| `payin:<id>` | money sitting on an agent card / number |
| `fee_revenue:RUB` | our fees |
| `fx:RUB`, `fx:RWF` | currency exchange position |
| `payout_due:RWF` | what we still owe recipients |
| `payout_float:RWF` | what we paid out from our money in Rwanda |

## Pages

Customer: `/` (calculator, rates, how it works, questions), `/signup`, `/signin`, `/app` (home), `/app/send`, `/app/orders`, `/app/orders/<ref>`, `/app/recipients`, `/app/kyc`.
Admin: `/admin` (order queue), `/admin/orders/<ref>`, `/admin/kyc`, `/admin/corridors` (rates and fees), `/admin/payin` (agent accounts and daily usage), `/admin/users`, `/admin/ledger`.
Languages: English and Russian (`src/lib/i18n`).

## Before going live

- Real legal entity, agreement with every card agent, and lawyer-checked Terms and Privacy (drafts in `/terms`, `/privacy`).
- Move uploaded files from local disk to private S3-compatible storage (`src/lib/storage.ts`).
- HTTPS hosting, daily database backups, a strong `SESSION_SECRET`, and a real admin password.
- Replace the in-memory login limiter with Redis if you run more than one server.
