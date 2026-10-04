-- Ergo customer emails (quotes, invoices, reminders), in English (US, $) or Greek (€)
-- Run in Supabase → SQL Editor after schema.sql. Safe to re-run.
-- Emails go out through Brevo (brevo.com). The API key lives in Supabase Vault, never in the app.
-- Finish setup with supabase/email-keys.sql.

create extension if not exists pg_net;

alter table public.settings add column if not exists locale text not null default 'en';
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

-- $1,234.50 for the US version, 1.234,50 € for the Greek one
create or replace function public.fmt_money(n numeric, loc text) returns text language sql immutable as $$
  select case when loc = 'el'
    then translate(to_char(round(coalesce(n, 0), 2), 'FM999,999,990.00'), ',.', '.,') || ' €'
    else '$' || to_char(round(coalesce(n, 0), 2), 'FM999,999,990.00') end
$$;

create or replace function public.fmt_day(d timestamptz, loc text) returns text language sql immutable as $$
  select case when d is null then '' when loc = 'el' then to_char(d, 'DD/MM/YYYY') else to_char(d, 'FMMon FMDD, YYYY') end
$$;

create or replace function public.unit_label(u text, loc text) returns text language sql immutable as $$
  select case when loc = 'el' then
    case u when 'ea' then 'τεμ.' when 'hr' then 'ώρα' when 'm' then 'μ' when 'm²' then 'μ²' when 'day' then 'ημέρα'
           when 'kg' then 'κιλά' when 'l' then 'λίτρα' when 'ft' then 'πόδια' when 'sqft' then 'τ. πόδια' when 'lb' then 'λίβρες' when 'gal' then 'γαλόνια' else u end
  else case u when 'sqft' then 'sq ft' else u end end
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
  w public.work; c public.customers; s public.settings; loc text; gr boolean;
  api_key text; sender text; subj text; heading text; intro text; button text; extra text := '';
  rows_html text; sub numeric; vat numeric; total numeric; ref text; biz text; body jsonb; rid bigint;
  sent_today int; sent_this int;
begin
  select * into w from public.work where id = p_work and owner_id = auth.uid();
  if not found then raise exception 'This item doesn’t exist. / Αυτό δεν υπάρχει.'; end if;
  select * into s from public.settings where owner_id = w.owner_id;
  loc := coalesce(s.locale, 'en'); gr := loc = 'el';

  if p_kind not in ('quote', 'invoice', 'reminder') then raise exception 'Unknown email type.'; end if;
  if p_link is null or p_link !~ '^https?://' then
    raise exception '%', case when gr then 'Λείπει ο σύνδεσμος του πελάτη.' else 'The customer link is missing.' end;
  end if;
  if p_kind = 'quote' and w.stage <> 'sent' then
    raise exception '%', case when gr then 'Μόνο προσφορές που αναμένουν έγκριση στέλνονται με email.' else 'Only quotes waiting for approval can be emailed.' end;
  end if;
  if p_kind in ('invoice', 'reminder') and w.stage not in ('invoiced', 'paid') then
    raise exception '%', case when gr then 'Εκδώστε πρώτα το τιμολόγιο.' else 'Generate the invoice first.' end;
  end if;

  select * into c from public.customers where id = w.customer_id;
  if c.email is null or c.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception '%', case when gr then 'Προσθέστε πρώτα email για αυτόν τον πελάτη.' else 'Add an email address for this customer first.' end;
  end if;

  -- Simple abuse limits
  select count(*) into sent_today from public.email_log where owner_id = auth.uid() and created_at > now() - interval '1 day';
  if sent_today >= 60 then
    raise exception '%', case when gr then 'Φτάσατε το ημερήσιο όριο email. Δοκιμάστε αύριο.' else 'Daily email limit reached. Try again tomorrow.' end;
  end if;
  select count(*) into sent_this from public.email_log where work_id = w.id and created_at > now() - interval '1 hour';
  if sent_this >= 5 then
    raise exception '%', case when gr then 'Στάλθηκε πολλές φορές την τελευταία ώρα. Δοκιμάστε αργότερα.' else 'This was emailed several times in the last hour. Try again later.' end;
  end if;

  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'email_sender';
  if coalesce(api_key, '') = '' or coalesce(sender, '') = '' then
    raise exception '%', case when gr then 'Τα email δεν έχουν ρυθμιστεί ακόμη. Αντιγράψτε τον σύνδεσμο και στείλτε τον εσείς.'
      else 'Customer emails aren’t set up yet. Copy the link and send it yourself for now.' end;
  end if;

  biz := coalesce(nullif(s.business_name, ''), case when gr then 'Ο τεχνικός σας' else 'Your tradesperson' end);

  select coalesce(sum((i->>'qty')::numeric * (i->>'rate')::numeric), 0),
         string_agg(format(
           '<tr><td style="padding:10px 0;border-bottom:1px solid #E3E7E4;font-size:14px;color:#16202A">%s<br><span style="color:#58636E;font-size:12px">%s %s × %s</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #E3E7E4;font-size:14px;color:#16202A;white-space:nowrap">%s</td></tr>',
           public.esc_html(i->>'desc'), public.esc_html(i->>'qty'), public.esc_html(public.unit_label(i->>'unit', loc)),
           public.fmt_money((i->>'rate')::numeric, loc), public.fmt_money((i->>'qty')::numeric * (i->>'rate')::numeric, loc)), '')
    into sub, rows_html
    from jsonb_array_elements(w.items) i;
  vat := round(sub * w.vat / 100, 2);
  total := sub + vat;

  if p_kind = 'quote' then
    ref := 'Q-' || w.no;
    if gr then
      subj := format('Προσφορά %s από %s: %s', ref, biz, w.title);
      heading := 'Η προσφορά σας είναι έτοιμη';
      intro := format('%s σας έστειλε προσφορά για <b>%s</b>. Ρίξτε μια ματιά και εγκρίνετέ την online αν σας καλύπτει.', public.esc_html(biz), public.esc_html(w.title));
      button := 'Προβολή και έγκριση';
    else
      subj := format('Quote %s from %s: %s', ref, biz, w.title);
      heading := 'Your quote is ready';
      intro := format('%s has sent you a quote for <b>%s</b>. Take a look, and approve it online if you’re happy.', public.esc_html(biz), public.esc_html(w.title));
      button := 'View and approve quote';
    end if;
  else
    ref := 'INV-' || w.no;
    if p_kind = 'invoice' then
      subj := case when gr then format('Τιμολόγιο %s από %s', ref, biz) else format('Invoice %s from %s', ref, biz) end;
      heading := case when gr then 'Το τιμολόγιό σας' else 'Your invoice' end;
      intro := case when gr then format('Σας ευχαριστούμε που επιλέξατε %s. Ακολουθεί το τιμολόγιο για <b>%s</b>.', public.esc_html(biz), public.esc_html(w.title))
        else format('Thanks for choosing %s. Here’s the invoice for <b>%s</b>.', public.esc_html(biz), public.esc_html(w.title)) end;
    else
      subj := case when gr then format('Υπενθύμιση: τιμολόγιο %s από %s', ref, biz) else format('Reminder: invoice %s from %s', ref, biz) end;
      heading := case when w.due_at < now() then (case when gr then 'Το τιμολόγιό σας έχει λήξει' else 'Your invoice is overdue' end)
        else (case when gr then 'Μια φιλική υπενθύμιση' else 'A friendly reminder' end) end;
      intro := case when gr then format('Σας υπενθυμίζουμε το τιμολόγιο %s για <b>%s</b>, με λήξη %s.', ref, public.esc_html(w.title), public.fmt_day(w.due_at, loc))
        else format('This is a reminder about invoice %s for <b>%s</b>, due on %s.', ref, public.esc_html(w.title), public.fmt_day(w.due_at, loc)) end;
    end if;
    button := case when gr then 'Προβολή τιμολογίου' else 'View invoice' end;
    extra := case when gr
        then format('<p style="margin:16px 0 0;font-size:14px;color:#16202A">Λήξη <b>%s</b>. Αναγράψτε <b>%s</b> στην αιτιολογία πληρωμής.</p>', public.fmt_day(w.due_at, loc), ref)
        else format('<p style="margin:16px 0 0;font-size:14px;color:#16202A">Due <b>%s</b>. Please use <b>%s</b> as the payment reference.</p>', public.fmt_day(w.due_at, loc), ref) end
      || case when coalesce(s.bank_details, '') <> '' then format('<p style="margin:8px 0 0;font-size:14px;color:#58636E">%s</p>', public.esc_html(s.bank_details)) else '' end;
  end if;

  body := jsonb_build_object(
    'sender', jsonb_build_object('email', sender, 'name', left(biz, 70)),
    'to', jsonb_build_array(jsonb_build_object('email', c.email, 'name', coalesce(c.name, ''))),
    'subject', subj,
    'htmlContent', format($html$
<!doctype html><html lang="%s"><body style="margin:0;background:#ECEFED;font-family:Helvetica,Arial,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#ECEFED;padding:24px 12px"><tr><td align="center">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;padding:28px">
<tr><td>%s<p style="margin:0 0 4px;font-size:13px;color:#2456D3;font-weight:bold;letter-spacing:1px">%s</p>
<h1 style="margin:0 0 12px;font-size:24px;color:#16202A">%s</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#16202A">%s %s,<br>%s</p>
<table width="100%%" cellpadding="0" cellspacing="0">%s
<tr><td style="padding:8px 0 0;font-size:13px;color:#58636E">%s</td><td align="right" style="padding:8px 0 0;font-size:13px;color:#58636E">%s</td></tr>
<tr><td style="font-size:13px;color:#58636E">%s %s%%</td><td align="right" style="font-size:13px;color:#58636E">%s</td></tr>
<tr><td style="padding-top:8px;font-size:18px;font-weight:bold;color:#16202A">%s</td><td align="right" style="padding-top:8px;font-size:18px;font-weight:bold;color:#16202A">%s</td></tr>
</table>%s
<p style="margin:24px 0"><a href="%s" style="display:inline-block;background:#2456D3;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px;font-size:15px">%s</a></p>
<p style="margin:0;font-size:13px;color:#58636E">%s%s</p>
</td></tr></table>
<p style="font-size:12px;color:#8A949D;margin:16px 0 0">%s</p>
</td></tr></table></body></html>$html$,
      loc,
      case when coalesce(s.logo_url, '') <> '' then format('<img src="%s" alt="%s" style="max-height:52px;max-width:200px;margin-bottom:16px">', public.esc_html(s.logo_url), public.esc_html(biz)) else '' end,
      case when p_kind = 'quote' then (case when gr then 'ΠΡΟΣΦΟΡΑ ' else 'QUOTE ' end) else (case when gr then 'ΤΙΜΟΛΟΓΙΟ ' else 'INVOICE ' end) end || ref,
      heading,
      case when gr then 'Γεια σας' else 'Hi' end,
      public.esc_html(split_part(coalesce(c.name, ''), ' ', 1)),
      intro, rows_html,
      case when gr then 'Υποσύνολο' else 'Subtotal' end, public.fmt_money(sub, loc),
      case when gr then 'ΦΠΑ' else 'Tax' end, rtrim(rtrim(to_char(w.vat, 'FM990.99'), '0'), '.'), public.fmt_money(vat, loc),
      case when gr then 'Σύνολο' else 'Total' end, public.fmt_money(total, loc),
      extra, public.esc_html(p_link), button,
      public.esc_html(biz),
      case when coalesce(s.phone, '') <> '' or coalesce(s.email, '') <> '' then ' · ' || public.esc_html(concat_ws(' · ', nullif(s.phone, ''), nullif(s.email, ''))) else '' end,
      case when gr then 'Στάλθηκε με το Ergo' else 'Sent with Ergo' end)
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
