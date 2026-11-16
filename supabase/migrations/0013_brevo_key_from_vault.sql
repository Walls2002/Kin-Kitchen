-- The notify-web-order Edge Function reads its Brevo API key from Supabase Vault
-- when the BREVO_API_KEY function secret isn't set. Store the key once (never in
-- this repo) with:
--   select vault.create_secret('<xkeysib-…>', 'brevo_api_key', 'Brevo API key used by notify-web-order');
-- Only the service role (the Edge Function) can call this; anon and signed-in users can't.
-- Run after 0012.

create or replace function public.brevo_api_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'brevo_api_key' order by created_at desc limit 1;
$$;

revoke all on function public.brevo_api_key() from public, anon, authenticated;
grant execute on function public.brevo_api_key() to service_role;
