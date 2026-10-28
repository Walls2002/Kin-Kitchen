-- Recipes: the ways a product is sold, each with its own price (the price list):
-- [{ id, name, units, price, extras: [{ ingredient_id, qty }], note }].
-- units is how many of the recipe's units one variety is (6 for a box of 6 pc);
-- extras are pantry items only that variety uses (icing, a gift box).
-- Run after 0008.
alter table recipes add column if not exists varieties jsonb not null default '[]';
