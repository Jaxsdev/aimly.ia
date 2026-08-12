-- Run once in the Supabase SQL Editor before deploying this change.
-- Excalidraw keeps image pixels separately from image elements.
alter table public.excalidraw_scenes
  add column if not exists files jsonb not null default '{}'::jsonb;
