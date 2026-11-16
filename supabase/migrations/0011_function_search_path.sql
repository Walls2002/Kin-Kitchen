-- Pin search_path on public functions (Supabase security advisor lint 0011:
-- function_search_path_mutable). Settings only; no data or behaviour changes.
alter function public.touch_updated_at() set search_path = public;
alter function public.log_price_change() set search_path = public;
alter function public.price_movers(integer) set search_path = public;
alter function public.ping() set search_path = public;
