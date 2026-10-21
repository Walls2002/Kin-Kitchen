-- Recipe targets are now "profit on cost" (markup): 50 means price = cost x 1.5.
-- They can go above 100%, so the old 0-95 check is replaced. Run after 0003.
alter table recipes drop constraint if exists recipes_target_margin_check;
alter table recipes add constraint recipes_target_margin_check check (target_margin between 0 and 1000);
alter table recipes alter column target_margin set default 50;
-- Recipes saved before this change hold a margin on the selling price (m%).
-- The same price as profit on cost is m / (100 - m) * 100. Uncomment to convert them:
-- update recipes set target_margin = round(target_margin / (100 - target_margin) * 100, 1) where target_margin < 100;
