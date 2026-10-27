-- Recipes: a reference video (YouTube or any link) to watch while baking.
-- Bake mode shows it as a Video button. Run after 0007.
alter table recipes add column if not exists video_url text;
