# Putting Inzira online — step by step

Everything below works from a phone browser. Total time: about 30–40 minutes.
You will create 2 free accounts (Supabase and Vercel) and, optionally, a Telegram bot and an Anthropic API key.

At the end your site is at an address like **https://inzira.vercel.app** (you can add your own domain later).

---

## Step 1 — Database and file storage (Supabase, free)

1. Open **https://supabase.com** → **Start your project** → **Continue with GitHub**.
2. **New project**
   - Name: `inzira`
   - Database password: press **Generate a password** and **save it** somewhere safe.
   - Region: **Central EU (Frankfurt)**, the closest to both Russia and Rwanda.
   - Press **Create new project** and wait about 2 minutes.
3. **Connection strings:** press **Connect** at the top, then the **ORM** tab, then choose **Prisma**. You will see two lines:
   - `DATABASE_URL=...` (port **6543**, ends with `?pgbouncer=true`) → copy it.
   - `DIRECT_URL=...` (port **5432**) → copy it.
   - In both, replace `[YOUR-PASSWORD]` with the password from step 2.
4. **Private file bucket** (for receipts and passports): left menu **Storage** → **New bucket**
   - Name: `inzira-files`
   - **Public bucket: OFF** (very important: these are passports)
   - Create.
5. **Storage keys:** **Storage** → **Settings** (or **S3 Configuration**) → turn on **S3 connection** if it is off.
   - Copy **Endpoint** (looks like `https://xxxx.supabase.co/storage/v1/s3`) and **Region** (e.g. `eu-central-1`).
   - Press **New access key** → copy **Access key ID** and **Secret access key** (the secret is shown only once).

## Step 2 — Telegram bot (free, 3 minutes, optional but recommended)

1. In Telegram open **@BotFather** → send `/newbot`.
2. Name: `Inzira`. Username: for example `inzira_transfers_bot` (must end with `bot`).
3. BotFather gives you a **token** like `7412345678:AAH...` → copy it.
4. Your own chat ID, so the team alerts reach you: open **@userinfobot** → it replies with your **Id** (a number) → copy it.
5. Open your new bot and press **Start** once (a bot cannot write to you before you do).

## Step 3 — AI receipt check (optional, about $0.01–0.03 per receipt)

1. Open **https://console.anthropic.com** → sign up → **Billing** → add credit ($5 is enough to start).
2. **API keys** → **Create key** → copy it (starts with `sk-ant-`).

Without this key everything still works: receipts are checked by hand, and duplicate receipt files are still caught.

## Step 4 — The website (Vercel, free to start)

1. Open **https://vercel.com** → **Sign up** → **Continue with GitHub**.
2. **Add New… → Project** → find **First-one** → **Import**.
3. **Root Directory:** press **Edit** → choose **`web`** → Continue. Very important.
4. Open **Environment Variables** and add each line below (Name = left part, Value = right part):

| Name | Value |
|---|---|
| `DATABASE_URL` | from Step 1.3 (port 6543) |
| `DIRECT_URL` | from Step 1.3 (port 5432) |
| `SESSION_SECRET` | 64 random letters and digits (use a password generator) |
| `SETUP_TOKEN` | another long random code; you need it once in Step 5 |
| `APP_URL` | `https://inzira.vercel.app` (fix it after the first deploy if Vercel gives another address) |
| `NEXT_PUBLIC_BRAND` | `Inzira` |
| `NEXT_PUBLIC_WHATSAPP` | your support WhatsApp number, digits only, e.g. `79991234567` |
| `NEXT_PUBLIC_TELEGRAM` | your support Telegram username without @ |
| `S3_ENDPOINT` | from Step 1.5 |
| `S3_REGION` | from Step 1.5 |
| `S3_BUCKET` | `inzira-files` |
| `S3_ACCESS_KEY_ID` | from Step 1.5 |
| `S3_SECRET_ACCESS_KEY` | from Step 1.5 |
| `TELEGRAM_BOT_TOKEN` | from Step 2.3 |
| `TELEGRAM_BOT_USERNAME` | your bot's username without @ |
| `TELEGRAM_WEBHOOK_SECRET` | random letters and digits (no spaces) |
| `TELEGRAM_ADMIN_CHAT_ID` | from Step 2.4 |
| `ANTHROPIC_API_KEY` | from Step 3.2 |

5. Press **Deploy**. It takes 2–3 minutes. Vercel creates the database tables automatically during the build.
6. When it shows **Congratulations**, press the picture of the site. Copy the address it opened.
   If it is not the same as `APP_URL`, go to **Settings → Environment Variables**, fix `APP_URL`, then **Deployments → ⋯ → Redeploy**.

## Step 5 — First start (2 minutes)

1. Open **https://YOUR-ADDRESS/setup**
2. Enter the `SETUP_TOKEN`, your name, your email and a strong admin password (12+ characters) → **Create admin**.
3. You land on **Admin → Settings**. Check that each line is **on**.
4. Press **Connect Telegram bot**, then **Send test message**. You should get a message from your bot.
5. **Rates & fees:** set today's real market rate for RUB→RWF and RWF→RUB, and your margin and fees.
6. **Pay-in accounts:** add your agents' real cards / SBP phones / MoMo numbers with daily limits.
7. Open the site from another phone, create a customer account, and make a small real test transfer.

`/setup` stops working by itself once an admin exists. You can then delete `SETUP_TOKEN` from Vercel.

## After launch

- **Your own domain** (for example `inzira.rw` or `inzira.app`): Vercel → Project → **Settings → Domains** → add it and follow the DNS steps. Then update `APP_URL`, redeploy, and press **Connect Telegram bot** again.
- **Updates:** every new commit pushed to the repository's default branch (now `claude/nifty-bell-5n9n7p`) is deployed by Vercel automatically.
- **Backups:** Supabase free plan keeps daily backups for 7 days. Before handling real volume, move to a paid plan.

## Honest notes

- **Vercel's free plan is for non-commercial use.** When you start earning, move to Vercel Pro ($20/month).
- Supabase's free plan pauses a project after 1 week with no visits; open the site once a week while testing, or upgrade.
- Russian bank cards cannot pay these foreign services. Use a card from Rwanda (or another country).
- **WhatsApp messages** need a Meta WhatsApp Business account with a verified business and an approved message template. Telegram works right away, so start with Telegram.
- Before taking real customers' money: register the business, sign a written agreement with every card agent, and have a lawyer check the Terms and Privacy pages.
