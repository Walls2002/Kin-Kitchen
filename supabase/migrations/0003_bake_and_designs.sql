-- Kin Kitchen: recipe steps for Bake mode, and the cake design board.
-- Run after 0002_business.sql.

alter table recipes add column if not exists steps jsonb not null default '[]';

create table sketches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  title text not null,
  order_id uuid references orders(id) on delete set null,
  template text not null default 'blank'
    check (template in ('blank','round-top','round-side','two-tier','sheet','cupcakes')),
  strokes jsonb not null default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on sketches (user_id, updated_at desc);
create index on sketches (order_id);
create trigger trg_touch before update on sketches for each row execute function touch_updated_at();

alter table sketches enable row level security;
create policy own_sketches on sketches for all using (user_id = auth.uid());
