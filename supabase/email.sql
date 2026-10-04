-- Chalkline customer emails (quotes, invoices, reminders)
-- Run in Supabase → SQL Editor after schema.sql. Safe to re-run.
-- Emails go out through Brevo (brevo.com). The API key lives in Supabase Vault, never in the app.
-- Finish setup with supabase/email-keys.sql.

create extension if not exists pg_net;

alter table public.work add column if not exists emailed_at timestamptz;
alter table public.work add column if not exists invoice_emailed_at timestamptz;
alter table public.work add column if not exists reminded_at timestamptz;

create table if not exists public.email_log (
  id bigserial primary key,
  owner_id uuid not null references auth.users on delete cascade,
  work_id uuid references public.work on delete set null,
  kind text not null,
  to_email text not null,
  request_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists email_log_owner_idx on public.email_log(owner_id, created_at desc);
alter table public.email_log enable row level security;
do $$ begin
  create policy "own email log" on public.email_log for select using (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

create or replace function public.esc_html(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

create or replace function public.fmt_eur(n numeric) returns text language sql immutable as $$
  select '€' || to_char(round(coalesce(n, 0), 2), 'FM999,999,990.00')
$$;

-- Is email set up? (the app shows this in Settings)
create or replace function public.email_ready() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'brevo_api_key' and coalesce(decrypted_secret, '') <> '')
     and exists (select 1 from vault.decrypted_secrets where name = 'email_sender' and coalesce(decrypted_secret, '') <> '')
$$;

-- Send a quote, invoice or reminder to the customer of one piece of work.
create or replace function public.send_work_email(p_work uuid, p_kind text, p_link text)
returns json language plpgsql security definer set search_path = public as $$
declare
  w public.work; c public.customers; s public.settings;
  api_key text; sender text; subj text; heading text; intro text; button text; extra text := '';
  rows_html text; sub numeric; vat numeric; total numeric; ref text; biz text; body jsonb; rid bigint;
  sent_today int; sent_this int;
begin
  if p_kind not in ('quote', 'invoice', 'reminder') then raise exception 'Unknown email type.'; end if;
  if p_link is null or p_link !~ '^https?://' then raise exception 'The customer link is missing.'; end if;

  select * into w from public.work where id = p_work and owner_id = auth.uid();
  if not found then raise exception 'This item doesn’t exist.'; end if;
  if p_kind = 'quote' and w.stage <> 'sent' then raise exception 'Only quotes waiting for approval can be emailed.'; end if;
  if p_kind in ('invoice', 'reminder') and w.stage not in ('invoiced', 'paid') then raise exception 'Generate the invoice first.'; end if;

  select * into c from public.customers where id = w.customer_id;
  if c.email is null or c.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Add an email address for this customer first.';
  end if;

  -- Simple abuse limits
  select count(*) into sent_today from public.email_log where owner_id = auth.uid() and created_at > now() - interval '1 day';
  if sent_today >= 60 then raise exception 'Daily email limit reached. Try again tomorrow.'; end if;
  select count(*) into sent_this from public.email_log where work_id = w.id and created_at > now() - interval '1 hour';
  if sent_this >= 5 then raise exception 'This was emailed several times in the last hour. Try again later.'; end if;

  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'email_sender';
  if coalesce(api_key, '') = '' or coalesce(sender, '') = '' then
    raise exception 'Customer emails aren’t set up yet. Copy the link and send it yourself for now.';
  end if;

  select * into s from public.settings where owner_id = w.owner_id;
  biz := coalesce(nullif(s.business_name, ''), 'Your tradesperson');

  select coalesce(sum((i->>'qty')::numeric * (i->>'rate')::numeric), 0),
         string_agg(format(
           '<tr><td style="padding:10px 0;border-bottom:1px solid #E3E7E4;font-size:14px;color:#16202A">%s<br><span style="color:#58636E;font-size:12px">%s %s × %s</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #E3E7E4;font-size:14px;color:#16202A;white-space:nowrap">%s</td></tr>',
           public.esc_html(i->>'desc'), public.esc_html(i->>'qty'), public.esc_html(i->>'unit'),
           public.fmt_eur((i->>'rate')::numeric), public.fmt_eur((i->>'qty')::numeric * (i->>'rate')::numeric)), '')
    into sub, rows_html
    from jsonb_array_elements(w.items) i;
  vat := round(sub * w.vat / 100, 2);
  total := sub + vat;

  if p_kind = 'quote' then
    ref := 'Q-' || w.no;
    subj := format('Quote %s from %s: %s', ref, biz, w.title);
    heading := 'Your quote is ready';
    intro := format('%s has sent you a quote for <b>%s</b>. Have a look, and approve it online if you’re happy.', public.esc_html(biz), public.esc_html(w.title));
    button := 'View and approve quote';
  else
    ref := 'INV-' || w.no;
    if p_kind = 'invoice' then
      subj := format('Invoice %s from %s', ref, biz);
      heading := 'Your invoice';
      intro := format('Thanks for choosing %s. Here’s the invoice for <b>%s</b>.', public.esc_html(biz), public.esc_html(w.title));
    else
      subj := format('Reminder: invoice %s from %s', ref, biz);
      heading := case when w.due_at < now() then 'Your invoice is overdue' else 'A friendly reminder' end;
      intro := format('This is a reminder about invoice %s for <b>%s</b>, due on %s.', ref, public.esc_html(w.title), to_char(w.due_at, 'DD Mon YYYY'));
    end if;
    button := 'View invoice';
    extra := format('<p style="margin:16px 0 0;font-size:14px;color:#16202A">Due <b>%s</b>. Please use <b>%s</b> as the payment reference.</p>', to_char(w.due_at, 'DD Mon YYYY'), ref)
      || case when coalesce(s.bank_details, '') <> '' then format('<p style="margin:8px 0 0;font-size:14px;color:#58636E">%s</p>', public.esc_html(s.bank_details)) else '' end;
  end if;

  body := jsonb_build_object(
    'sender', jsonb_build_object('email', sender, 'name', left(biz, 70)),
    'to', jsonb_build_array(jsonb_build_object('email', c.email, 'name', coalesce(c.name, ''))),
    'subject', subj,
    'htmlContent', format($html$
<!doctype html><html><body style="margin:0;background:#ECEFED;font-family:Helvetica,Arial,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#ECEFED;padding:24px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;padding:28px">
<tr><td>%s<p style="margin:0 0 4px;font-size:13px;color:#2456D3;font-weight:bold;letter-spacing:1px">%s</p>
<h1 style="margin:0 0 12px;font-size:24px;color:#16202A">%s</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#16202A">Hi %s,<br>%s</p>
<table width="100%%" cellpadding="0" cellspacing="0">%s
<tr><td style="padding:8px 0 0;font-size:13px;color:#58636E">Subtotal</td><td align="right" style="padding:8px 0 0;font-size:13px;color:#58636E">%s</td></tr>
<tr><td style="font-size:13px;color:#58636E">VAT %s%%</td><td align="right" style="font-size:13px;color:#58636E">%s</td></tr>
<tr><td style="padding-top:8px;font-size:18px;font-weight:bold;color:#16202A">Total</td><td align="right" style="padding-top:8px;font-size:18px;font-weight:bold;color:#16202A">%s</td></tr>
</table>%s
<p style="margin:24px 0"><a href="%s" style="display:inline-block;background:#2456D3;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px;font-size:15px">%s</a></p>
<p style="margin:0;font-size:13px;color:#58636E">%s%s</p>
</td></tr></table>
<p style="font-size:12px;color:#8A949D;margin:16px 0 0">Sent with Chalkline</p>
</td></tr></table></body></html>$html$,
      case when coalesce(s.logo_url, '') <> '' then format('<img src="%s" alt="%s" style="max-height:52px;max-width:200px;margin-bottom:16px">', public.esc_html(s.logo_url), public.esc_html(biz)) else '' end,
      upper(case when p_kind = 'quote' then 'Quote ' else 'Invoice ' end) || ref,
      heading,
      public.esc_html(split_part(coalesce(c.name, ''), ' ', 1)),
      intro, rows_html,
      public.fmt_eur(sub), rtrim(to_char(w.vat, 'FM990.##'), '.'), public.fmt_eur(vat), public.fmt_eur(total),
      extra, public.esc_html(p_link), button,
      public.esc_html(biz),
      case when coalesce(s.phone, '') <> '' or coalesce(s.email, '') <> '' then ' · ' || public.esc_html(concat_ws(' · ', nullif(s.phone, ''), nullif(s.email, ''))) else '' end)
  );
  if coalesce(s.email, '') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    body := body || jsonb_build_object('replyTo', jsonb_build_object('email', s.email, 'name', left(biz, 70)));
  end if;

  select net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    body := body,
    headers := jsonb_build_object('api-key', api_key, 'content-type', 'application/json', 'accept', 'application/json'),
    timeout_milliseconds := 10000
  ) into rid;

  insert into public.email_log (owner_id, work_id, kind, to_email, request_id) values (w.owner_id, w.id, p_kind, c.email, rid);
  update public.work set
    emailed_at = case when p_kind = 'quote' then now() else emailed_at end,
    invoice_emailed_at = case when p_kind = 'invoice' then now() else invoice_emailed_at end,
    reminded_at = case when p_kind = 'reminder' then now() else reminded_at end
   where id = w.id;

  return json_build_object('ok', true, 'to', c.email, 'request', rid);
end $$;

-- Did Brevo accept the email? (pg_net sends in the background; the app checks a moment later)
create or replace function public.email_result(p_request bigint)
returns json language sql security definer set search_path = public stable as $$
  select json_build_object('status', r.status_code, 'error', r.error_msg, 'body', left(r.content, 600))
    from net._http_response r
    join public.email_log l on l.request_id = r.id
   where r.id = p_request and l.owner_id = auth.uid();
$$;

revoke execute on function public.send_work_email(uuid, text, text) from anon, public;
revoke execute on function public.email_result(bigint) from anon, public;
grant execute on function public.send_work_email(uuid, text, text) to authenticated;
grant execute on function public.email_result(bigint) to authenticated;
grant execute on function public.email_ready() to authenticated;
