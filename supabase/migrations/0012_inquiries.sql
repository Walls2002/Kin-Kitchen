-- Inquiries: everything the website sends (pre-orders, cake requests and questions)
-- lands in web_orders, shows on the CRM's Inquiries page, and is emailed to the owner.
--
-- 1. Questions get their own kind (they used to ride along as custom-cake requests),
--    and an "answered" status, for a question that needs a reply rather than an order.
-- 2. notified_at records when the owner's email went out, so each inquiry is emailed once.
-- 3. After every insert, pg_net calls the notify-web-order Edge Function, which sends
--    the email through Brevo (secret BREVO_API_KEY, set in Supabase, never in code).
--    The function only emails rows that exist and haven't been emailed, so calling it
--    from anywhere else can't send anything new.
-- Run after 0011.

alter table web_orders drop constraint if exists web_orders_kind_check;
alter table web_orders add constraint web_orders_kind_check check (kind in ('basket', 'custom-cake', 'question'));
alter table web_orders drop constraint if exists web_orders_status_check;
alter table web_orders add constraint web_orders_status_check check (status in ('new', 'converted', 'answered', 'dismissed'));
alter table web_orders add column if not exists notified_at timestamptz;

-- The public door, now taking questions too. Same validation as 0010.
create or replace function public.submit_web_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws constant text := E' \t\r\n';
  v_owner uuid;
  v_kind text;
  v_customer text;
  v_phone text;
  v_email text;
  v_contact_pref text;
  v_pickup_point text;
  v_pickup_raw text;
  v_pickup_date date;
  v_occasion text;
  v_notes text;
  v_raw_items jsonb;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_name text;
  v_qty_raw text;
  v_qty int;
  v_recent int;
  v_id uuid;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'The order must be a JSON object.';
  end if;

  v_kind := btrim(coalesce(payload->>'kind', ''), ws);
  if v_kind not in ('basket', 'custom-cake', 'question') then
    raise exception 'Unknown request kind. Use "basket", "custom-cake" or "question".';
  end if;

  v_customer := btrim(coalesce(payload->>'customer', ''), ws);
  if length(v_customer) = 0 then
    raise exception 'Please give your name.';
  end if;
  if length(v_customer) > 120 then
    raise exception 'Your name is too long (120 characters at most).';
  end if;

  v_phone        := nullif(left(btrim(coalesce(payload->>'phone', ''), ws), 200), '');
  v_email        := nullif(left(btrim(coalesce(payload->>'email', ''), ws), 200), '');
  v_contact_pref := nullif(left(btrim(coalesce(payload->>'contact_pref', ''), ws), 200), '');
  v_pickup_point := nullif(left(btrim(coalesce(payload->>'pickup_point', ''), ws), 200), '');
  v_occasion     := nullif(left(btrim(coalesce(payload->>'occasion', ''), ws), 200), '');
  v_notes        := nullif(left(btrim(coalesce(payload->>'notes', ''), ws), 2000), '');

  if v_phone is null and v_email is null then
    raise exception 'Please give a phone number or an email address so we can reach you.';
  end if;
  if v_kind = 'question' and v_notes is null then
    raise exception 'Please write your question.';
  end if;

  v_pickup_raw := nullif(btrim(coalesce(payload->>'pickup_date', ''), ws), '');
  if v_pickup_raw is not null then
    if v_pickup_raw !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'The pickup date must be a date like 2026-12-24.';
    end if;
    begin
      v_pickup_date := v_pickup_raw::date;
    exception when others then
      raise exception 'The pickup date is not a real date.';
    end;
  end if;

  v_raw_items := coalesce(payload->'items', '[]'::jsonb);
  if jsonb_typeof(v_raw_items) = 'null' then
    v_raw_items := '[]'::jsonb;
  end if;
  if jsonb_typeof(v_raw_items) <> 'array' then
    raise exception 'Items must be a list.';
  end if;
  if jsonb_array_length(v_raw_items) > 40 then
    raise exception 'Too many items (40 at most).';
  end if;

  for v_item in select value from jsonb_array_elements(v_raw_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Each item must be an object with a name and a quantity.';
    end if;
    v_name := btrim(coalesce(v_item->>'name', ''), ws);
    if length(v_name) = 0 or length(v_name) > 120 then
      raise exception 'Each item needs a name of 1 to 120 characters.';
    end if;
    v_qty_raw := btrim(coalesce(v_item->>'qty', ''), ws);
    if v_qty_raw !~ '^\d{1,2}$' then
      raise exception 'The quantity for "%" must be a whole number from 1 to 99.', v_name;
    end if;
    v_qty := v_qty_raw::int;
    if v_qty < 1 or v_qty > 99 then
      raise exception 'The quantity for "%" must be a whole number from 1 to 99.', v_name;
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'name', v_name,
      'category', nullif(left(btrim(coalesce(v_item->>'category', ''), ws), 200), ''),
      'qty', v_qty,
      'note', nullif(left(btrim(coalesce(v_item->>'note', ''), ws), 200), '')
    ));
  end loop;

  if v_kind = 'basket' and jsonb_array_length(v_items) = 0 then
    raise exception 'The basket is empty. Add at least one item.';
  end if;
  -- A question carries no basket and no pickup.
  if v_kind = 'question' then
    v_items := '[]'::jsonb;
    v_pickup_point := null;
    v_pickup_date := null;
    v_occasion := null;
  end if;

  select id into v_owner from auth.users order by created_at asc limit 1;
  if v_owner is null then
    raise exception 'The shop is not set up to take orders yet.';
  end if;

  -- Abuse guard: at most 5 requests per phone number or email in 10 minutes.
  select count(*) into v_recent
  from web_orders w
  where w.user_id = v_owner
    and w.created_at > now() - interval '10 minutes'
    and (
      (v_phone is not null and regexp_replace(coalesce(w.phone, ''), '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
        and regexp_replace(v_phone, '\D', '', 'g') <> '')
      or (v_email is not null and lower(w.email) = lower(v_email))
    );
  if v_recent >= 5 then
    raise exception 'We already have several messages from you in the last few minutes. Please wait a little before sending another.';
  end if;

  insert into web_orders (user_id, kind, customer, phone, email, contact_pref, pickup_point, pickup_date, occasion, notes, items)
  values (v_owner, v_kind, v_customer, v_phone, v_email, v_contact_pref, v_pickup_point, v_pickup_date, v_occasion, v_notes, v_items)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_web_order(jsonb) from public;
grant execute on function public.submit_web_order(jsonb) to anon, authenticated;

-- Email the owner after every new inquiry. pg_net queues the call and returns at once,
-- so a slow or failing email never blocks or undoes the insert.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_web_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://sphsjanghxzghvbwzevo.supabase.co/functions/v1/notify-web-order',
      body := jsonb_build_object('id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    raise warning 'notify_web_order: could not queue the email for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.notify_web_order() from public, anon, authenticated;

drop trigger if exists web_orders_notify on web_orders;
create trigger web_orders_notify after insert on web_orders
for each row execute function public.notify_web_order();
