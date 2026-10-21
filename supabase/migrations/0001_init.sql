-- Kin Kitchen schema. Run once in the Supabase SQL editor (or `supabase db push`).

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  name text not null,
  sort_order int default 0,
  unique (user_id, name)
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  unit text not null default 'g' check (unit in ('g','ml','pc')),
  package_size numeric not null check (package_size > 0),
  price numeric not null check (price >= 0),
  cost_per_unit numeric generated always as (price / package_size) stored,
  supplier text,
  stock_qty numeric not null default 0,
  low_stock_at numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, category_id, name)
);

create table price_history (
  id bigint generated always as identity primary key,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  price numeric not null check (price >= 0),
  package_size numeric not null check (package_size > 0),
  cost_per_unit numeric generated always as (price / package_size) stored,
  supplier text,
  recorded_at timestamptz not null default now()
);
create index on price_history (ingredient_id, recorded_at desc);
create index on ingredients (user_id, updated_at desc);

-- keep updated_at fresh
create function touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end $$ language plpgsql;
create trigger trg_touch before update on ingredients
for each row execute function touch_updated_at();

-- log price changes
create function log_price_change() returns trigger as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.package_size is distinct from old.package_size
     or new.supplier is distinct from old.supplier then
    insert into price_history (ingredient_id, price, package_size, supplier)
    values (new.id, new.price, new.package_size, new.supplier);
  end if;
  return new;
end $$ language plpgsql;
create trigger trg_price_log after insert or update on ingredients
for each row execute function log_price_change();

-- row level security
alter table categories enable row level security;
alter table ingredients enable row level security;
alter table price_history enable row level security;
create policy own_categories on categories for all using (user_id = auth.uid());
create policy own_ingredients on ingredients for all using (user_id = auth.uid());
create policy own_history on price_history for all using (
  exists (select 1 from ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);

-- Biggest movers: % change in cost per unit over the last `days` days.
-- Baseline is the cost in effect when the window opened (last entry on or before
-- the window start), or the first entry inside the window for newer ingredients.
create function price_movers(days int default 30)
returns table (id uuid, name text, unit text, old_cpu numeric, new_cpu numeric, pct_change numeric)
language sql stable security invoker as $$
  select i.id, i.name, i.unit, b.cost_per_unit as old_cpu, i.cost_per_unit as new_cpu,
         round((i.cost_per_unit - b.cost_per_unit) / nullif(b.cost_per_unit, 0) * 100, 1) as pct_change
  from ingredients i
  cross join lateral (
    select coalesce(
      (select h.cost_per_unit from price_history h
        where h.ingredient_id = i.id and h.recorded_at <= now() - make_interval(days => days)
        order by h.recorded_at desc limit 1),
      (select h.cost_per_unit from price_history h
        where h.ingredient_id = i.id and h.recorded_at > now() - make_interval(days => days)
        order by h.recorded_at asc limit 1)
    ) as cost_per_unit
  ) b
  where b.cost_per_unit is not null
    and b.cost_per_unit is distinct from i.cost_per_unit
  order by abs(i.cost_per_unit - b.cost_per_unit) / nullif(b.cost_per_unit, 0) desc
$$;

-- Keep-alive target for the scheduled ping; touches the database without exposing data.
create function ping() returns text language sql stable as $$ select 'ok'::text $$;
grant execute on function ping() to anon;
