-- Ergo billing: 14-day free trial, Paddle subscriptions and read-only mode after the trial.
-- Run after schema.sql in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- How it fits together
--   • Everyone gets a 14-day trial from the day they sign up. No card needed.
--   • Paying happens in Paddle's checkout. Paddle then calls the paddle-webhook Edge Function,
--     which writes the subscription into public.subscriptions.
--   • public.account_access() tells the app where the account stands.
--   • When billing.enforce is on, accounts without a trial or a paid plan become read-only:
--     they can see everything but can't add or change quotes, jobs, invoices, customers or prices.
--   • Enforcement starts OFF so nothing changes for anyone until Paddle is set up and tested.

-- ---------- configuration (one row) ----------
create table if not exists public.billing (
  id int primary key default 1 check (id = 1),
  enforce boolean not null default false,          -- turn on once checkout works
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  client_token text not null default '',           -- Paddle → Developer tools → Authentication → client-side token (safe to show)
  prices jsonb not null default '{}'::jsonb,       -- {"solo":{"month":"pri_…","year":"pri_…"},"trade":{…}}  (Crew is coming soon)
  trial_days int not null default 14
);
insert into public.billing (id) values (1) on conflict (id) do nothing;
alter table public.billing enable row level security;   -- no policies: only the functions below read it

-- ---------- one subscription per account, written only by the webhook ----------
create table if not exists public.subscriptions (
  owner_id uuid primary key references auth.users on delete cascade,
  status text not null default 'none',             -- active, trialing, past_due, paused, canceled
  plan text,                                       -- solo, trade, crew
  billing_interval text,                           -- month, year
  paddle_customer_id text,
  paddle_subscription_id text unique,
  price_id text,
  current_period_end timestamptz,
  scheduled_change text,                           -- e.g. 'cancel' when cancelled at period end
  scheduled_change_at timestamptz,
  paddle_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
do $$ begin
  create policy "read own subscription" on public.subscriptions for select using (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---------- where the account stands ----------
create or replace function public.account_access()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  b public.billing; s public.subscriptions; started timestamptz; trial_end timestamptz;
  paid boolean; on_trial boolean; plan text;
begin
  if auth.uid() is null then return null; end if;
  select * into b from public.billing where id = 1;
  select * into s from public.subscriptions where owner_id = auth.uid();
  select created_at into started from auth.users where id = auth.uid();
  trial_end := coalesce(started, now()) + make_interval(days => coalesce(b.trial_days, 14));
  paid := s.status in ('active', 'trialing', 'past_due');
  on_trial := not coalesce(paid, false) and now() < trial_end;
  plan := case when paid then s.plan when on_trial then 'trial' else 'none' end;
  return jsonb_build_object(
    'enforced', coalesce(b.enforce, false),
    'environment', coalesce(b.environment, 'sandbox'),
    'clientToken', coalesce(b.client_token, ''),
    'prices', coalesce(b.prices, '{}'::jsonb),
    'trialEndsAt', trial_end,
    'status', coalesce(s.status, 'none'),
    'plan', plan,
    'paidPlan', s.plan,
    'interval', s.billing_interval,
    'priceId', s.price_id,
    'periodEnd', s.current_period_end,
    'scheduledChange', s.scheduled_change,
    'scheduledChangeAt', s.scheduled_change_at,
    'hasSubscription', s.paddle_subscription_id is not null and s.status <> 'canceled',
    'canWrite', not coalesce(b.enforce, false) or coalesce(paid, false) or on_trial
  );
end $$;
grant execute on function public.account_access() to authenticated;

-- Can this account make changes right now?
create or replace function public.can_write()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((public.account_access() ->> 'canWrite')::boolean, false)
$$;

-- Trade features (emailing customers, reminders, logo, saved price list).
-- Solo has the core flow. The trial and Crew include everything.
create or replace function public.can_use(p_feature text)
returns boolean language plpgsql security definer set search_path = public stable as $$
declare a jsonb := public.account_access();
begin
  if a is null then return false; end if;
  if not (a ->> 'enforced')::boolean then return true; end if;
  if not (a ->> 'canWrite')::boolean then return false; end if;
  if a ->> 'plan' in ('trial', 'trade', 'crew') then return true; end if;
  return p_feature not in ('email', 'logo', 'prices');
end $$;
grant execute on function public.can_write() to authenticated;
grant execute on function public.can_use(text) to authenticated;

-- ---------- read-only after the trial ----------
-- Reading and deleting stay open (your data is always yours). Adding and changing need an active trial or plan.
drop policy if exists "own customers" on public.customers;
drop policy if exists "own prices" on public.price_items;
drop policy if exists "own work" on public.work;
drop policy if exists "customers read" on public.customers;
drop policy if exists "customers add" on public.customers;
drop policy if exists "customers change" on public.customers;
drop policy if exists "customers delete" on public.customers;
drop policy if exists "prices read" on public.price_items;
drop policy if exists "prices add" on public.price_items;
drop policy if exists "prices change" on public.price_items;
drop policy if exists "prices delete" on public.price_items;
drop policy if exists "work read" on public.work;
drop policy if exists "work add" on public.work;
drop policy if exists "work change" on public.work;
drop policy if exists "work delete" on public.work;

create policy "customers read"   on public.customers   for select using (owner_id = auth.uid());
create policy "customers add"    on public.customers   for insert with check (owner_id = auth.uid() and public.can_write());
create policy "customers change" on public.customers   for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_write());
create policy "customers delete" on public.customers   for delete using (owner_id = auth.uid());

create policy "prices read"      on public.price_items for select using (owner_id = auth.uid());
create policy "prices add"       on public.price_items for insert with check (owner_id = auth.uid() and public.can_use('prices'));
create policy "prices change"    on public.price_items for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_use('prices'));
create policy "prices delete"    on public.price_items for delete using (owner_id = auth.uid());

create policy "work read"        on public.work        for select using (owner_id = auth.uid());
create policy "work add"         on public.work        for insert with check (owner_id = auth.uid() and public.can_write());
create policy "work change"      on public.work        for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_write());
create policy "work delete"      on public.work        for delete using (owner_id = auth.uid());

-- ---------- after you have created your Paddle products, fill these in and run just this part ----------
-- update public.billing set
--   environment  = 'sandbox',                    -- 'production' when you go live
--   client_token = 'test_…',                     -- client-side token
--   prices = '{
--     "solo":  {"month": "pri_…", "year": "pri_…"},
--     "trade": {"month": "pri_…", "year": "pri_…"}
--   }'::jsonb;
--
-- When a test purchase works end to end, switch on the trial limits:
-- update public.billing set enforce = true;
