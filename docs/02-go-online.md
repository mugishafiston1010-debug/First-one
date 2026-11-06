# Putting Inzira online — simple guide

You need **one account: Vercel** (sign in with GitHub). The database is created inside Vercel with one click.
Everything works from a phone browser. Time: about 20 minutes.

---

## Level 1 — the site online

### Step 1. Create the Vercel account
1. Open **https://vercel.com/signup**
2. Choose **Hobby**, type your name → **Continue with GitHub** → **Authorize Vercel**.

### Step 2. Import the project
1. On the Vercel dashboard press **Add New… → Project**.
2. Next to **First-one** press **Import**. If you don't see it, press **Adjust GitHub App Permissions** and allow access to First-one.
3. **Project Name:** `inzira`
4. **Root Directory:** press **Edit** → select **`web`** → **Continue**. ⚠️ This is the most important setting.
5. Open **Environment Variables** and add these 2:

| Key | Value |
|---|---|
| `SESSION_SECRET` | a long random code (64 letters/digits) |
| `SETUP_TOKEN` | another long random code (you will type it once in Step 5) |

6. Press **Deploy** and wait 2–3 minutes. It will finish even though there is no database yet.

### Step 3. Create the database (one click)
1. In your project open the **Storage** tab → **Create Database**.
2. Choose **Neon** (Serverless Postgres) → **Continue**.
3. Region: **Frankfurt (eu-central-1)**. Plan: **Free** → **Create**.
4. When asked, **Connect** it to the project `inzira` (keep the environments ticked, and leave the prefix empty).

### Step 4. Deploy again (this creates the tables)
1. Open the **Deployments** tab → press **⋯** on the top line → **Redeploy** → **Redeploy**.
2. Wait 2–3 minutes until it says **Ready**.

### Step 5. Open your site and create the admin
1. Your address is shown on the project page, e.g. **https://inzira.vercel.app** (it may have extra letters).
2. Open **https://YOUR-ADDRESS/setup**
3. Type the `SETUP_TOKEN`, your name, your email and a strong password (12+ characters) → **Create admin**.
4. In **Admin → Rates & fees**, set today's real rates. In **Pay-in accounts**, add the real cards/numbers of your agents and turn off the demo ones (there are none online, they exist only in the test copy).
5. Open the site on another phone, create a customer account, and try a small transfer.

✅ The site is online.

---

## Level 2 — extras (any time later)

Add them in Vercel → **Settings → Environment Variables**, then **Redeploy**.

**Telegram bot** (free)
1. Telegram → **@BotFather** → `/newbot` → name `Inzira` → username, e.g. `inzira_transfers_bot` → copy the **token**.
2. **@userinfobot** → copy your **Id**. Open your new bot and press **Start**.
3. Add: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (without @), `TELEGRAM_ADMIN_CHAT_ID` (your Id), `TELEGRAM_WEBHOOK_SECRET` (random letters/digits).
4. Redeploy → **Admin → Settings** → **Connect Telegram bot** → **Send test message**.

**AI receipt check** (about $0.01–0.03 per receipt)
1. **https://console.anthropic.com** → Billing → add $5 → API keys → Create key.
2. Add `ANTHROPIC_API_KEY` → Redeploy.

**Support contacts shown on the site:** `NEXT_PUBLIC_WHATSAPP` (digits only, e.g. `79991234567`) and `NEXT_PUBLIC_TELEGRAM` (username without @).

**Your own domain** (e.g. `inzira.app`): Vercel → Settings → Domains. Then add `APP_URL=https://your-domain`, Redeploy, and press **Connect Telegram bot** again.

**More file space:** receipts and passports are stored privately in the database (about 500 MB on the free plan, roughly 1,000+ uploads). When it fills up, add a private S3 bucket (Supabase Storage or Cloudflare R2) with the `S3_*` variables in `web/.env.example`.

---

## Honest notes
- Vercel and Neon free plans are for starting and testing. With real business volume: Vercel Pro ($20/month) and a paid Neon plan for backups.
- Russian bank cards cannot pay these foreign services; use a Rwandan card.
- WhatsApp messages need a Meta-approved WhatsApp Business account; use Telegram first.
- Before taking real customers' money: register the business, sign agreements with your card agents, and have a lawyer check the Terms and Privacy pages.
