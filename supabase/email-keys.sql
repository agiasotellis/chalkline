-- Store your Brevo details in Supabase Vault (encrypted). Run once in the SQL Editor.
-- 1. Replace the two values below.
-- 2. Run. To change them later, just edit and run again.

do $$
declare
  api_key text := 'PASTE-YOUR-BREVO-API-KEY-HERE';          -- Brevo → SMTP & API → API keys → Generate (starts with xkeysib-)
  sender  text := 'PASTE-YOUR-VERIFIED-SENDER-EMAIL-HERE';  -- Brevo → Senders, domains & IPs → Senders (must be verified)
  sid uuid;
begin
  select id into sid from vault.secrets where name = 'brevo_api_key';
  if sid is null then perform vault.create_secret(api_key, 'brevo_api_key'); else perform vault.update_secret(sid, api_key); end if;
  select id into sid from vault.secrets where name = 'email_sender';
  if sid is null then perform vault.create_secret(sender, 'email_sender'); else perform vault.update_secret(sid, sender); end if;
end $$;

select public.email_ready() as email_is_ready;
