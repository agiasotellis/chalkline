-- Ergo renewal reminders: one email before each renewal.
--   Yearly plans: 7 days before.   Monthly plans: 3 days before.
-- Sent through Brevo (the same keys as customer emails) every morning at 08:00 UTC.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.

alter table public.subscriptions add column if not exists reminded_for timestamptz;  -- the renewal date we last reminded about
alter table public.billing add column if not exists app_url text not null default 'https://agiasotellis.github.io/chalkline/app.html';

create or replace function public.send_renewal_reminders()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record; api_key text; sender text; gr boolean; plan text; day text; link text;
  subj text; html text; sent int := 0;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'email_sender';
  if coalesce(api_key, '') = '' or coalesce(sender, '') = '' then return 0; end if;   -- emails not set up yet
  select app_url || '#/plan' into link from public.billing where id = 1;

  for r in
    select s.*, u.email, coalesce(st.locale, 'en') as loc, coalesce(nullif(st.owner_name, ''), '') as who
      from public.subscriptions s
      join auth.users u on u.id = s.owner_id
      left join public.settings st on st.owner_id = s.owner_id
     where s.status = 'active'
       and s.scheduled_change is null                                   -- not cancelling
       and s.current_period_end > now()
       and s.current_period_end <= now() + case when s.billing_interval = 'year' then interval '7 days' else interval '3 days' end
       and s.reminded_for is distinct from s.current_period_end         -- once per renewal
       and coalesce(u.email, '') <> ''
  loop
    gr := r.loc = 'el';
    plan := initcap(coalesce(r.plan, ''));
    day := public.fmt_day(r.current_period_end, r.loc);
    if gr then
      subj := format('Το πακέτο Ergo %s ανανεώνεται στις %s', plan, day);
      html := format(
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#16202A;font-size:15px;line-height:1.6">'
        '<p>Γεια σας%s,</p>'
        '<p>Το %s πακέτο <b>%s</b> του Ergo ανανεώνεται αυτόματα στις <b>%s</b>. Η Paddle θα χρεώσει την κάρτα που έχετε δηλώσει και θα σας στείλει την απόδειξη.</p>'
        '<p>Αν θέλετε να το κρατήσετε, δεν χρειάζεται να κάνετε τίποτα. Για αλλαγή πακέτου, κάρτας ή ακύρωση:</p>'
        '<p><a href="%s" style="display:inline-block;background:#2456D3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Πακέτο και χρεώσεις</a></p>'
        '<p style="color:#58636E;font-size:13px">Ergo · Προσφορά. Δουλειά. Άρα, πληρωμή.</p></div>',
        case when r.who <> '' then ' ' || public.esc_html(split_part(r.who, ' ', 1)) else '' end,
        case when r.billing_interval = 'year' then 'ετήσιο' else 'μηνιαίο' end, plan, day, link);
    else
      subj := format('Your Ergo %s plan renews on %s', plan, day);
      html := format(
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#16202A;font-size:15px;line-height:1.6">'
        '<p>Hi%s,</p>'
        '<p>Your %s Ergo <b>%s</b> plan renews automatically on <b>%s</b>. Paddle will charge the card on file and email you the receipt.</p>'
        '<p>If you want to keep it, there’s nothing to do. To change plan, update your card or cancel:</p>'
        '<p><a href="%s" style="display:inline-block;background:#2456D3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Plan and billing</a></p>'
        '<p style="color:#58636E;font-size:13px">Ergo · Quote. Job. Therefore, paid.</p></div>',
        case when r.who <> '' then ' ' || public.esc_html(split_part(r.who, ' ', 1)) else '' end,
        case when r.billing_interval = 'year' then 'yearly' else 'monthly' end, plan, day, link);
    end if;

    perform net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      body := jsonb_build_object(
        'sender', jsonb_build_object('email', sender, 'name', 'Ergo'),
        'to', jsonb_build_array(jsonb_build_object('email', r.email)),
        'subject', subj, 'htmlContent', html),
      headers := jsonb_build_object('api-key', api_key, 'content-type', 'application/json', 'accept', 'application/json'),
      timeout_milliseconds := 10000);
    update public.subscriptions set reminded_for = r.current_period_end where owner_id = r.owner_id;
    sent := sent + 1;
  end loop;
  return sent;
end $$;
revoke execute on function public.send_renewal_reminders() from anon, authenticated, public;

-- Run it every morning (Supabase includes pg_cron).
create extension if not exists pg_cron;
select cron.schedule('ergo-renewal-reminders', '0 8 * * *', 'select public.send_renewal_reminders()');

select 'Renewal reminders scheduled for 08:00 UTC daily.' as result;
