-- Cake designs: the frosting colour of the cake surface (null = vanilla).
-- Piping strokes need no change: they live in the strokes jsonb with tool 'pipe' and a 'tip'.
-- Run after 0004.
alter table sketches add column if not exists surface text;
-- Per-part colours set with the Fill tool (tier tops and sides, cupcake frosting, the drum).
alter table sketches add column if not exists layers jsonb not null default '{}';
