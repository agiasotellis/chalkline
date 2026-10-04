-- Chalkline database schema
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Every table is private to the signed-in tradesperson (row level security).
-- Customers reach a single quote through its secret token via two security-definer functions.

create extension if not exists pgcrypto;

-- ---------- business settings (one row per user) ----------
create table if not exists public.settings (
  owner_id uuid primary key references auth.users on delete cascade default auth.uid(),
  business_name text not null default 'My business',
  owner_name text default '',
  email text default '',
  phone text default '',
  address text default '',
  vat_number text default '',
  vat_rate numeric(5,2) not null default 24,
  payment_terms_days int not null default 14,
  bank_details text default '',
  quote_valid_days int not null default 30,
  updated_at timestamptz not null default now()
);

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  email text default '',
  phone text default '',
  address text default '',
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists customers_owner_idx on public.customers(owner_id);

-- ---------- saved price list ----------
create table if not exists public.price_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  description text not null,
  unit text not null default 'ea',
  rate numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists price_items_owner_idx on public.price_items(owner_id);

-- ---------- work: one row follows Quote -> Job -> Invoice ----------
create table if not exists public.work (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade default auth.uid(),
  no int not null,
  title text not null,
  stage text not null default 'draft'
    check (stage in ('draft','sent','approved','job','done','invoiced','paid')),
  customer_id uuid references public.customers on delete set null,
  items jsonb not null default '[]'::jsonb,      -- [{desc, qty, unit, rate}]
  tasks jsonb not null default '[]'::jsonb,      -- [{t, done}]
  vat numeric(5,2) not null default 24,
  notes text default '',
  token uuid not null default gen_random_uuid(), -- secret for the customer link
  change_request text,
  sent_at timestamptz, approved_at timestamptz, approved_by text,
  started_at timestamptz, done_at timestamptz,
  invoiced_at timestamptz, due_at timestamptz, paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, no)
);
create index if not exists work_owner_idx on public.work(owner_id);
create unique index if not exists work_token_idx on public.work(token);

-- next job number per user, starting at 1001
create or replace function public.next_work_no() returns trigger language plpgsql as $$
begin
  if new.no is null or new.no = 0 then
    select coalesce(max(no), 1000) + 1 into new.no from public.work where owner_id = new.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists work_no on public.work;
create trigger work_no before insert on public.work for each row execute function public.next_work_no();

create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists work_touch on public.work;
create trigger work_touch before update on public.work for each row execute function public.touch();

-- ---------- row level security ----------
alter table public.settings enable row level security;
alter table public.customers enable row level security;
alter table public.price_items enable row level security;
alter table public.work enable row level security;

do $$ begin
  create policy "own settings" on public.settings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own customers" on public.customers for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own prices" on public.price_items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own work" on public.work for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---------- public customer link ----------
-- Returns only what the customer needs to see. No login required.
create or replace function public.get_public_quote(p_token uuid)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'no', w.no, 'title', w.title, 'stage', w.stage, 'items', w.items, 'vat', w.vat, 'notes', w.notes,
    'sentAt', w.sent_at, 'approvedAt', w.approved_at, 'approvedBy', w.approved_by,
    'invoicedAt', w.invoiced_at, 'dueAt', w.due_at, 'paidAt', w.paid_at, 'changeRequest', w.change_request,
    'customer', json_build_object('name', c.name, 'address', c.address),
    'business', json_build_object('name', s.business_name, 'email', s.email, 'phone', s.phone,
                                  'address', s.address, 'vatNumber', s.vat_number, 'bank', s.bank_details,
                                  'validDays', s.quote_valid_days)
  )
  from public.work w
  left join public.customers c on c.id = w.customer_id
  left join public.settings s on s.owner_id = w.owner_id
  where w.token = p_token and w.stage <> 'draft';
$$;

create or replace function public.approve_public_quote(p_token uuid, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Name required'; end if;
  update public.work set stage = 'approved', approved_at = now(), approved_by = left(trim(p_name), 120), change_request = null
   where token = p_token and stage = 'sent';
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public.request_quote_change(p_token uuid, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.work set change_request = left(coalesce(trim(p_note), ''), 2000)
   where token = p_token and stage = 'sent';
  get diagnostics n = row_count;
  return n = 1;
end $$;

grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.approve_public_quote(uuid, text) to anon, authenticated;
grant execute on function public.request_quote_change(uuid, text) to anon, authenticated;
