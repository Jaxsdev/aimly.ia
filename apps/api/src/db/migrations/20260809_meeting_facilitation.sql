-- Estado de preparación individual antes de iniciar una reunión.
alter table public.meeting_participants
  add column if not exists is_ready boolean not null default false,
  add column if not exists ready_at timestamptz;

-- El cronograma generado por AimLy se conserva para todos los asistentes y reconexiones.
create table if not exists public.meeting_agendas (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  introduction text not null default '',
  phases jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meeting_agendas enable row level security;

create policy "Participants can view meeting agendas"
  on public.meeting_agendas for select
  using (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = meeting_agendas.meeting_id and mp.user_id = auth.uid()
  ));

create policy "Hosts can manage meeting agendas"
  on public.meeting_agendas for all
  using (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = meeting_agendas.meeting_id and mp.user_id = auth.uid() and mp.role = 'host'
  ));
