-- Cake designs: more shapes (three tiers, square tiers, heart, bento, drip, number
-- cakes 0-9) and more than one view per design (a top view and a side view...).
-- Run after 0005.
alter table sketches drop constraint if exists sketches_template_check;
alter table sketches add constraint sketches_template_check check (
  template in ('blank','round-top','round-side','two-tier','three-tier','sheet','square-tiers','cupcakes','heart','bento','drip')
  or template ~ '^number-[0-9]$'
);
-- Views after the first: [{ template, strokes, surface, layers }]. The row's own columns are the first view.
alter table sketches add column if not exists extra_views jsonb not null default '[]';
