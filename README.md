# Chalkline

Quote → Job → Invoice for tradespeople. Create a quote, the customer approves it online, convert it to a job with a checklist, then generate the invoice. One job number (Q-1042 → J-1042 → INV-1042) follows the work from first visit to paid.

## What's here
- `index.html` — landing page plus a working front-end demo of the workspace (no build step, no dependencies). Data is stored in the browser's localStorage.
- `src/app.html` — the same page without the document wrapper (used for the hosted preview).

## Run it
Open `index.html` in a browser, or enable **GitHub Pages** (Settings → Pages → Deploy from branch → `main` / root).

## Pricing (planned)
| Plan | Monthly | For |
|---|---|---|
| Solo | €15 | One person, unlimited quotes, online approval, invoices |
| Trade | €22 | Card payments, deposits, automatic reminders, accounting export |
| Crew | €30 | Up to 5 users, job assignment, schedule board |

## Next steps to make it a real product
1. Backend + auth (e.g. Supabase or Postgres + Next.js API routes)
2. Public customer approval link per quote with signed token
3. Email delivery (Postmark/Resend) and PDF invoices
4. Stripe for subscriptions and customer card payments
