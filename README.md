# Ergo

Quote → Job → Invoice for tradespeople. Create a quote, the customer approves it online, it becomes a job with a checklist, and the invoice is generated when the job is done. One number (Q-1042 → J-1042 → INV-1042) follows the work from first visit to paid.

## What's in the repo

| Path | What it is |
|---|---|
| `index.html` | Marketing landing page (built from `landing/body.html` by `scripts/build-landing.sh`) |
| `app.html` + `src/` | The app: React + Vite |
| `supabase/schema.sql` | Database tables, security rules and the customer-approval functions |
| `.github/workflows/deploy.yml` | Builds and publishes to GitHub Pages on every push to `main` |

### App features
- Dashboard: money awaiting approval, work booked, unpaid/overdue, paid last 30 days, "needs attention" list, jobs in progress, paid-per-month chart
- Quotes: editor with line items, units, VAT, notes and a saved price list; new customers can be added inline
- Customer link: a private page where the customer approves with their name or requests a change, no login needed
- Jobs: quote lines become tasks; tick them off, then mark the job complete
- Invoices: generated from the job with payment terms and bank details; mark paid; print or save as PDF
- Customers with job history, price list, business settings
- Light/dark mode, phone layout with a bottom tab bar

## Two versions

The first time someone opens the site, they pick **United States** (English, $) or **Ελλάδα** (Greek, €). The choice is remembered and can be changed any time from the flag button in the header (landing page and app) or in Settings. It sets the language of the app, the currency, and the language of the customer page and customer emails (stored per business in `settings.locale`). Light mode is the default; dark mode is a toggle.

Translations live in `src/lib/locales/en.js` and `src/lib/locales/el.js` (app) and in the `LX` object in `landing/body.html` (landing page).

## Pages
- `/` landing page
- `/app.html` the real app (sign up, data saved in Supabase)
- `/demo.html` the demo (example data, saved only in the browser)

## Run it locally

```bash
npm install
npm run dev
```
Then open http://localhost:5173/app.html (live) or http://localhost:5173/demo.html (demo).

## Supabase setup (one time)

The project is already wired in through `.env` (URL + publishable key, which are safe to ship).

1. Supabase → **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. Safe to re-run after updates.
2. **Authentication → URL Configuration**
   - Site URL: `https://agiasotellis.github.io/chalkline/app.html`
   - Redirect URLs: add `https://agiasotellis.github.io/chalkline/**` and `http://localhost:5173/**`
3. Optional: **Authentication → Sign In / Providers → Email** — turn off "Confirm email" while testing so sign-ups work instantly.

## Customer emails (Brevo, free: 300 emails a day)

Quotes, invoices and reminders are emailed from the database through Brevo, so no key ever reaches the browser.

1. Sign up at [brevo.com](https://www.brevo.com).
2. **Senders, domains & IPs → Senders → Add a sender**: use the email customers should see (e.g. your business Gmail) and confirm it from your inbox.
3. **SMTP & API → API keys → Generate a new API key**, copy it.
4. Supabase **SQL Editor**: run `supabase/email.sql`, then paste `supabase/email-keys.sql`, put in your key and sender email, and run it. It should answer `email_is_ready = true`.
5. In the app, Settings → Customer emails shows **On**. Replies go to the business email in Settings.

Tip: emails sent from a free Gmail address through Brevo can land in spam. With your own domain, verify it in Brevo and send from it for the best delivery.

## Deploy

Every push to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`).

## Plans and payments (Paddle)
Every account starts with a 14-day free trial, no card needed. Paddle is the checkout and Merchant of Record (it handles VAT, receipts, refunds and payouts). Setup, step by step: **[docs/PADDLE.md](docs/PADDLE.md)**.

| Plan | Monthly | Yearly | Includes |
|---|---|---|---|
| Solo | $15 / €15 | $150 / €150 | Unlimited quotes, jobs and invoices, online approval, checklists, tax and payment terms |
| Trade | $22 / €22 | $220 / €220 | Solo + quotes and invoices emailed to customers, reminders, your logo, saved price list |
| Crew | $30 / €30 | coming soon | Trade + up to 5 team members, job assignment, schedule board |

- `supabase/billing.sql`: trial, subscriptions, and read-only mode after the trial (enforced in the database).
- `supabase/functions/paddle-webhook`: Paddle → Ergo, records subscriptions.
- `supabase/functions/paddle-billing`: opens Paddle's customer portal and switches plans.
- `legal.html`: terms, refund policy and privacy policy (fill in the `COMPANY` block).

## Roadmap
1. Notifications when a customer approves
2. Card payments and deposits for customers on approval
3. Job photos (Supabase Storage)
4. Crew plan: team members, job assignment and schedule board
5. Accounting export (QuickBooks, Xero, myDATA)

## Brand

Logo files live in `brand/ergo2/` (SVG + PNG; the `A-*` files are the logo in use). The mark is the "therefore" sign ∴, since ergo means therefore: two ink dots for quote and job, and a chalk-blue dot on top for paid. `brand/work/ergo2.py` regenerates every file and `brand/work/apply_a.py` puts the logo into the app, landing page and favicon. Earlier explorations are kept in `brand/ergo/` and `brand/logo/`.
