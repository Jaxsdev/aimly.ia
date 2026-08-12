-- Persistent, compact context for AimLy and safe interactive meeting artifacts.
create table if not exists public.meeting_memories (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  summary text not null default '',
  facts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_artifacts (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  type text not null check (type in ('impact_effort_matrix')),
  title text not null,
  data jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
