-- Recipes: utilities per batch, itemized (electricity, water, gas...): [{ name, cost }].
-- overhead_cost stays as their total so order costs and reports read it as before.
-- Recipes saved before this keep their overhead_cost and show it as one "Overhead" line.
-- Run after 0006.
alter table recipes add column if not exists utilities jsonb not null default '[]';
