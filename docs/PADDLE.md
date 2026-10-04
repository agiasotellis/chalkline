# Taking payments with Paddle

Ergo sells two plans, **Solo** and **Trade**, monthly or yearly. **Crew** shows as “Coming soon”.
Everyone gets a **14-day free trial** with no card. Paddle runs the checkout and is the
**Merchant of Record**: it charges the customer, adds and files VAT or sales tax, sends receipts,
handles refunds, and pays you out.

```
Customer clicks “Choose Trade” in Ergo
  → Paddle checkout opens on top of the app (card, Apple Pay, PayPal…)
  → Paddle charges the card and emails the receipt
  → Paddle tells Ergo (webhook → Supabase Edge Function “paddle-webhook”)
  → the account is marked Trade in public.subscriptions and unlocks within seconds
```

Do everything in the **sandbox** first (fake money), then repeat steps 2–4 and 8 in the live account.

---

## 1. Create a Paddle sandbox account

Sign up at **sandbox-vendors.paddle.com**. Sandbox accounts work straight away.

## 2. Create the products and prices

**Catalog → Products → New product**, twice:

| Product      | Tax category | Monthly price           | Yearly price              |
|--------------|--------------|-------------------------|---------------------------|
| Ergo Solo    | Standard digital goods (SaaS) | $15 USD, every 1 month | $150 USD, every 1 year |
| Ergo Trade   | Standard digital goods (SaaS) | $22 USD, every 1 month | $220 USD, every 1 year |

On each price, add a **price override** for EUR so Greek customers pay €15 / €150 / €22 / €220.
Don’t add a trial period in Paddle: Ergo already gives 14 days free before checkout.

Copy the four **price IDs** (they start with `pri_`).

## 3. Get your keys

**Developer tools → Authentication**

- **Client-side token** (starts with `test_`). Safe to show in the browser.
- **API key**. Give it permission to read and write **subscriptions** and to create **customer portal sessions**. Keep this secret.

## 4. Point the checkout at your site

**Checkout → Checkout settings → Default payment link**:
`https://agiasotellis.github.io/chalkline/app.html`

## 5. Supabase: database

In **SQL Editor**, run these files from the repo, in this order:

1. `supabase/billing.sql` (new: trial, subscriptions, read-only rules)
2. `supabase/email.sql` again (adds the Trade check for emailing customers)

Then fill in your values and run:

```sql
update public.billing set
  environment  = 'sandbox',
  client_token = 'test_xxxxxxxxxxxxxxxx',
  prices = '{
    "solo":  {"month": "pri_xxx", "year": "pri_xxx"},
    "trade": {"month": "pri_xxx", "year": "pri_xxx"}
  }'::jsonb;
```

Nothing is locked yet: `billing.enforce` stays off until step 9.

## 6. Supabase: the two server functions

**Edge Functions → Deploy a new function → Via editor**

| Name             | Code                                          | Verify JWT |
|------------------|-----------------------------------------------|------------|
| `paddle-webhook` | `supabase/functions/paddle-webhook/index.ts`  | **Off** (Paddle can’t sign in) |
| `paddle-billing` | `supabase/functions/paddle-billing/index.ts`  | On |

Paste the code, set the name exactly as above, deploy. For `paddle-webhook`, open its
**Details** and switch **Enforce JWT verification** off.

## 7. Tell Paddle where to send updates

**Paddle → Developer tools → Notifications → New destination**

- URL: `https://lzrkvjtpniavnmswvhxe.supabase.co/functions/v1/paddle-webhook`
- Events: all `subscription.*` events (created, updated, activated, canceled, past_due, paused, resumed, trialing)

Save, then copy the destination’s **secret key** (starts with `pdl_ntfset_`).

**Supabase → Edge Functions → Secrets**, add:

| Name                     | Value                          |
|--------------------------|--------------------------------|
| `PADDLE_API_KEY`         | the API key from step 3        |
| `PADDLE_WEBHOOK_SECRET`  | the secret key from this step  |

## 8. Test a purchase

1. Open the app, sign in, go to **Plan**, choose **Trade**.
2. Pay with Paddle’s test card **4242 4242 4242 4242**, any future expiry, CVC **100**.
3. Within a few seconds the Plan page shows **Trade plan · Renews on …**.
4. Try **Manage subscription** (opens Paddle’s page) and switching to yearly.

If the plan doesn’t appear: Paddle → Notifications → your destination → **Logs** shows whether
Paddle reached the function, and Supabase → Edge Functions → paddle-webhook → **Logs** shows why
it failed (usually a wrong secret, or JWT verification still on).

## 9. Switch on the trial limits

```sql
update public.billing set enforce = true;
```

From now on:

| Account                | Can do                                                        |
|------------------------|---------------------------------------------------------------|
| Trial (first 14 days)  | Everything                                                    |
| Solo                   | Quotes, jobs, invoices, online approval, sharing links        |
| Trade                  | Solo + emailing customers, reminders, logo, saved price list  |
| Trial over / cancelled | Read-only: view and delete, no new or changed work            |

The database enforces this (row level security), so it can’t be bypassed from the browser.
To pause the limits at any time: `update public.billing set enforce = false;`

## 10. Go live

1. Fill in your legal name, address and support email at the top of `legal.html` (the `COMPANY` block). Paddle reviews your site before approving live payments: it checks the pricing, terms, refund policy and privacy policy, all linked from the landing page footer.
2. Sign up at **vendors.paddle.com** and complete verification (identity, business details, website).
3. Under **Business account → Payouts**, add your bank account (IBAN). Paddle pays your balance out to it, minus its fee (5% + $0.50 per transaction).
4. Repeat steps 2, 3, 4 and 7 in the live account.
5. Update Supabase with the live values:

```sql
update public.billing set
  environment  = 'production',
  client_token = 'live_xxxxxxxxxxxxxxxx',
  prices = '{"solo":{"month":"pri_…","year":"pri_…"},"trade":{"month":"pri_…","year":"pri_…"}}'::jsonb;
```

…and replace both secrets with the live API key and live notification secret.
