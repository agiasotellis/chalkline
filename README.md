# Chalkline

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

## Run it locally

```bash
npm install
npm run dev
```
Open the app at http://localhost:5173/app.html. With no Supabase keys it runs in **demo mode** with example data saved in your browser.

## Go live with Supabase (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Locally: copy `.env.example` to `.env.local` and paste both values.
5. In **Authentication → URL Configuration**, set the Site URL to where the app is hosted (e.g. `https://<you>.github.io/chalkline/app.html`).

Each tradesperson signs up with email and password and only ever sees their own data (row level security). Customers reach a single quote through its secret link via the `get_public_quote` / `approve_public_quote` functions.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (skip to deploy the demo).
4. Every push to `main` deploys. The landing page is at `/` and the app at `/app.html`.

## Pricing (planned)
| Plan | Monthly | For |
|---|---|---|
| Solo | €15 | One person, unlimited quotes, online approval, invoices |
| Trade | €22 | Card payments, deposits, automatic reminders, accounting export |
| Crew | €30 | Up to 5 users, job assignment, schedule board |

## Roadmap
1. Email delivery for quotes, invoices and reminders (Resend or Postmark via a Supabase Edge Function)
2. Notifications when a customer approves
3. Stripe: subscriptions for tradespeople, card payments and deposits for customers
4. Job photos (Supabase Storage)
5. Crew plan: team members and job assignment
