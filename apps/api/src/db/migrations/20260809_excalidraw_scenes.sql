-- Run once in the Supabase SQL Editor before deploying this change.
-- Stores the latest durable Excalidraw scene for each meeting.

create table if not exists public.excalidraw_scenes (
  meeting_id  uuid primary key references public.meetings(id) on delete cascade,
  elements    jsonb not null default '[]'::jsonb,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.excalidraw_scenes enable row level security;

drop policy if exists "Participants can view Excalidraw scenes" on public.excalidraw_scenes;
create policy "Participants can view Excalidraw scenes"
  on public.excalidraw_scenes for select
  using (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = excalidraw_scenes.meeting_id and mp.user_id = auth.uid()
  ));

drop policy if exists "Participants can save Excalidraw scenes" on public.excalidraw_scenes;
create policy "Participants can save Excalidraw scenes"
  on public.excalidraw_scenes for all
  using (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = excalidraw_scenes.meeting_id and mp.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = excalidraw_scenes.meeting_id and mp.user_id = auth.uid()
  ));
