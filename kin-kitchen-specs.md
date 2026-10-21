# Kin Kitchen Specs

Oct 15, 2026 · Wally

## Overview

Kin Kitchen is a lightweight web app for tracking baking ingredients: what each one costs, how much is in a package, how much is in stock, and how prices change over time. It runs on free tiers only and works the same on a PC browser and a phone.

**Goals**

- Keep every ingredient's price, package size and unit in one place, updated in a few taps
- Always know the real cost per gram, ml or piece, so packages of different sizes compare fairly
- Keep a full price history automatically, without manual logging
- See trends and problems at a glance on a dashboard (price increases, low stock, priciest items)
- Cost nothing to run

**Non goals for v1**

- Recipe costing, sales, orders or invoicing (listed under future enhancements)
- Multiple businesses or team roles; v1 is a single owner account
- Offline editing; the app needs a connection to save

## Tech stack

Supabase (Postgres) is the database, chosen over MongoDB because the data is relational: ingredients own a price history, and future recipes will reference ingredients. Postgres also computes cost per unit and trend queries directly in SQL.

| Layer | Choice | Cost | Why |
| --- | --- | --- | --- |
| Database + auth | Supabase free tier (Postgres, Auth, RLS) | Free | Relational data, triggers for price history, built in login |
| Frontend | Next.js (App Router) + TypeScript | Free | One codebase for UI and server actions |
| Styling | Tailwind CSS | Free | Fast responsive layouts, mobile first |
| Charts | Recharts | Free | Simple React charts, responsive containers |
| Data fetching | @supabase/supabase-js + @supabase/ssr | Free | Typed queries, session handling in Next.js |
| Hosting | Vercel Hobby | Free | Git push to deploy, preview URLs |
| Mobile | PWA (manifest + icons) | Free | Installable on phone home screen, no app store |

## Functional requirements

**Ingredients**

1. Add, edit and delete an ingredient with: name, category, unit, package size, package price, supplier, stock quantity, low stock threshold, notes.
2. Units are limited to `g`, `ml` and `pc`. Entry fields accept kg and L as a convenience and convert to g and ml before saving.
3. Cost per unit (price ÷ package size) is calculated by the database and shown everywhere next to the price.
4. Categories come from a fixed starter list (Flour, Sugar, Dairy, Eggs, Fats, Leaveners, Flavorings, Chocolate, Nuts and fruit, Packaging, Other) and can be extended.
5. Duplicate names in the same category are blocked.

**Prices and history**

1. Every time price, package size or supplier changes, a history row is written automatically by a database trigger.
2. The ingredient detail page shows the full history newest first, plus the change since the previous price as an amount and a percentage.
3. A history row can be added manually with a past date (for backfilling old receipts).

**Stock**

1. Quick adjust buttons on each ingredient: add or subtract an amount, or set an exact value.
2. An ingredient is flagged low stock when stock quantity is at or below its threshold.

**Finding things**

1. Search by name, filter by category, supplier and low stock.
2. Sort by name, price, cost per unit, stock, or last updated.

**Account**

1. Single user login with email magic link or email + password through Supabase Auth.
2. All data is private to the logged in user.

**Data export**

1. Export ingredients and price history to CSV.

## Data model

Three tables: `categories`, `ingredients` and `price_history`. Price history is never written by the app directly for normal edits; a trigger on `ingredients` writes it.

**ingredients**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid, PK | `gen_random_uuid()` |
| user_id | uuid, FK auth.users | defaults to `auth.uid()` |
| name | text, required | unique per user + category |
| category_id | uuid, FK categories | |
| unit | text, required | check in (`g`, `ml`, `pc`) |
| package_size | numeric, required | > 0, in the base unit |
| price | numeric, required | price per package, PHP |
| cost_per_unit | numeric, generated | `price / package_size` |
| supplier | text | |
| stock_qty | numeric | default 0, in the base unit |
| low_stock_at | numeric | default 0 |
| notes | text | |
| created_at, updated_at | timestamptz | `updated_at` set by trigger |

**price_history**

| Column | Type | Notes |
| --- | --- | --- |
| id | bigint identity, PK | |
| ingredient_id | uuid, FK ingredients | on delete cascade |
| price | numeric | |
| package_size | numeric | |
| cost_per_unit | numeric, generated | `price / package_size` |
| supplier | text | |
| recorded_at | timestamptz | default `now()`, editable for backfill |

**categories**: id, user_id, name (unique per user), sort_order.

**SQL**

```sql
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
  price numeric not null,
  package_size numeric not null,
  cost_per_unit numeric generated always as (price / package_size) stored,
  supplier text,
  recorded_at timestamptz not null default now()
);
create index on price_history (ingredient_id, recorded_at desc);

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
```

## Screens and UX

Six screens. Navigation is a left sidebar on desktop (≥ 1024px) and a bottom tab bar on mobile, with Dashboard, Ingredients and Settings as the main tabs.

| Screen | Route | Desktop | Mobile |
| --- | --- | --- | --- |
| Login | `/login` | Centered card, email field | Same, full width |
| Dashboard | `/` | Stat cards in a row, charts in a 2 column grid | Stat cards in a 2×2 grid, charts stacked full width |
| Ingredients list | `/ingredients` | Sortable table with filters above it | Card list (name, cost per unit, stock badge), filters in a bottom sheet |
| Ingredient detail | `/ingredients/[id]` | Info panel left, price chart + history table right | Info on top, chart, then history list |
| Add / edit ingredient | `/ingredients/new`, `/ingredients/[id]/edit` | Modal dialog | Full screen form, sticky Save button |
| Settings | `/settings` | Categories, CSV export, logout | Same, single column |

**UX rules**

- Floating "+ Add" button on mobile, header button on desktop.
- Number inputs use `inputmode="decimal"` so phones show the number keypad.
- Prices formatted as PHP (₱1,250.00); cost per unit shown to 4 decimals (₱0.1250/g).
- Low stock items get an amber badge; a price increase shows a red arrow with the % change, a drop shows green.
- Optimistic updates for stock adjustments, with an undo toast.
- Empty states explain the next action ("Add your first ingredient").
- Light and dark mode follow the system setting.

## Dashboard and charts

The dashboard answers three questions: what got more expensive, what is running low, and where the money goes. All charts use Recharts inside `ResponsiveContainer` so they resize between phone and desktop.

**Stat cards**

| Card | Value | Source |
| --- | --- | --- |
| Total ingredients | count | `ingredients` |
| Low stock | count, links to filtered list | `stock_qty <= low_stock_at` |
| Price changes (30 days) | count of history rows after the first per ingredient | `price_history` |
| Stock value | sum of `stock_qty × cost_per_unit` | `ingredients` |

**Charts**

| Chart | Type | Data | Where |
| --- | --- | --- | --- |
| Price trend | Line, cost per unit over time, one or several ingredients picked from a dropdown | `price_history` | Dashboard + ingredient detail |
| Biggest movers | Horizontal bar, % change in cost per unit over the last 30 / 90 days, top 10 | `price_history` | Dashboard |
| Cost per unit by ingredient | Horizontal bar, sorted high to low, filter by category | `ingredients` | Dashboard |
| Stock value by category | Bar, sum of stock value per category | `ingredients` + `categories` | Dashboard |
| Stock level vs threshold | Bar per low stock item with a threshold marker | `ingredients` | Dashboard |

**Biggest movers query** (as a Postgres view so the client reads it directly)

```sql
create view price_movers with (security_invoker = true) as
select distinct on (i.id)
  i.id, i.name,
  first_value(h.cost_per_unit) over w as old_cpu,
  i.cost_per_unit as new_cpu,
  round((i.cost_per_unit - first_value(h.cost_per_unit) over w)
        / nullif(first_value(h.cost_per_unit) over w, 0) * 100, 1) as pct_change
from ingredients i
join price_history h on h.ingredient_id = i.id
  and h.recorded_at >= now() - interval '90 days'
window w as (partition by i.id order by h.recorded_at);
```

The 30 / 90 day toggle can be a Supabase RPC function taking the interval as a parameter instead of a fixed view.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Responsiveness | Mobile first; works from 360px wide up to large desktops; no horizontal page scroll; tap targets at least 44px |
| PWA | Web manifest, 192px and 512px icons, standalone display, theme color; installable on Android and iOS home screens |
| Performance | Dashboard loads in under 2 seconds on 4G; lists paginate or virtualize past 200 items |
| Security | Supabase RLS on every table; only the anon key in the browser; service role key never shipped to the client |
| Validation | Shared Zod schemas for forms and server actions; positive numbers only for size and price |
| Backups | Monthly CSV export from Settings (free tier has no point in time recovery) |
| Accessibility | Labels on all inputs, color is never the only signal (arrows and text beside red/green) |

**Free tier limits to keep in mind**

- Supabase free projects pause after about 7 days with no activity. Opening the app regularly avoids it; otherwise a free scheduled ping (e.g. a GitHub Actions cron hitting a lightweight endpoint every few days) keeps it awake.
- Supabase free: 500 MB database, far more than an ingredient list will ever use.
- Vercel Hobby is for non commercial use; if this becomes part of a paid business tool, check whether the Pro plan is needed.

## Milestones and future enhancements

v1 is four milestones, each shippable on its own.

1. **Foundation**: Supabase project, schema + triggers + RLS, Next.js app on Vercel, login.
2. **Ingredients**: list with search, filters and sort; add / edit / delete; stock adjust; mobile card layout.
3. **History and dashboard**: ingredient detail with price chart and history; dashboard stat cards and charts; movers view.
4. **Polish**: PWA install, CSV export, dark mode, empty states, keep alive ping.

**Later**

- Recipe costing: `recipes` and `recipe_ingredients` tables, cost per batch and per piece using `cost_per_unit`, auto updating when prices change
- Suggested selling price from a target margin
- Multiple suppliers per ingredient with the cheapest highlighted
- Receipt photo upload to Supabase Storage attached to a price entry
- Low stock notifications by email
