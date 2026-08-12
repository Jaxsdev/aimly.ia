-- ============================================================
-- AimLy — Supabase Schema Migration
-- Run this inside your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles
-- extends auth.users created by Supabase Auth
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- trigger: create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- meetings
-- ============================================================
create type public.meeting_status as enum ('draft', 'active', 'closed');

create table if not exists public.meetings (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  objective         text not null,
  expected_outcome  text not null,
  status            public.meeting_status not null default 'draft',
  host_id           uuid not null references public.profiles(id),
  duration_minutes  integer not null default 30,
  started_at        timestamptz,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "Authenticated users can view meetings"
  on public.meetings for select
  using (auth.role() = 'authenticated');

create policy "Hosts can create meetings"
  on public.meetings for insert
  with check (auth.uid() = host_id);

create policy "Hosts can update meetings"
  on public.meetings for update
  using (auth.uid() = host_id);

-- ============================================================
-- meeting_participants
-- ============================================================
create type public.participant_role as enum ('host', 'participant');

create table if not exists public.meeting_participants (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  role        public.participant_role not null default 'participant',
  joined_at   timestamptz not null default now(),
  unique (meeting_id, user_id)
);

alter table public.meeting_participants enable row level security;

create policy "Participants can view participants in their meeting"
  on public.meeting_participants for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = meeting_participants.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Authenticated users can join meetings"
  on public.meeting_participants for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- chat_messages
-- ============================================================
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Participants can view messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = chat_messages.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Participants can insert messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = chat_messages.meeting_id
        and mp.user_id = auth.uid()
    )
  );

-- ============================================================
-- board_groups
-- ============================================================
create table if not exists public.board_groups (
  id                uuid primary key default uuid_generate_v4(),
  meeting_id        uuid not null references public.meetings(id) on delete cascade,
  title             text not null,
  created_by_agent  boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.board_groups enable row level security;

create policy "Participants can view groups"
  on public.board_groups for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = board_groups.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Participants can insert groups"
  on public.board_groups for insert
  with check (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = board_groups.meeting_id
        and mp.user_id = auth.uid()
    )
  );

-- ============================================================
-- board_cards
-- ============================================================
create type public.board_card_type as enum ('idea');

create table if not exists public.board_cards (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  text        text not null,
  type        public.board_card_type not null default 'idea',
  x           float not null default 50,
  y           float not null default 50,
  group_id    uuid references public.board_groups(id) on delete set null,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.board_cards enable row level security;

create policy "Participants can view cards"
  on public.board_cards for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = board_cards.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Participants can insert cards"
  on public.board_cards for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = board_cards.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Participants can update cards"
  on public.board_cards for update
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = board_cards.meeting_id
        and mp.user_id = auth.uid()
    )
  );

-- ============================================================
-- excalidraw_scenes
-- One durable scene per meeting. Realtime broadcasts remain ephemeral;
-- this table lets late joiners and reconnecting clients recover the canvas.
-- ============================================================
create table if not exists public.excalidraw_scenes (
  meeting_id  uuid primary key references public.meetings(id) on delete cascade,
  elements    jsonb not null default '[]'::jsonb,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.excalidraw_scenes add column if not exists files jsonb not null default '{}'::jsonb;

alter table public.excalidraw_scenes enable row level security;

create policy "Participants can view Excalidraw scenes"
  on public.excalidraw_scenes for select
  using (exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = excalidraw_scenes.meeting_id and mp.user_id = auth.uid()
  ));

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

-- ============================================================
-- votes
-- ============================================================
create type public.vote_status as enum ('open', 'closed');

create table if not exists public.votes (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  question    text not null,
  status      public.vote_status not null default 'open',
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

alter table public.votes enable row level security;

create policy "Participants can view votes"
  on public.votes for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = votes.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Hosts can create votes"
  on public.votes for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = votes.meeting_id
        and mp.user_id = auth.uid()
        and mp.role = 'host'
    )
  );

create policy "Hosts can update votes"
  on public.votes for update
  using (
    auth.uid() = created_by
  );

-- ============================================================
-- vote_options
-- ============================================================
create table if not exists public.vote_options (
  id          uuid primary key default uuid_generate_v4(),
  vote_id     uuid not null references public.votes(id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0
);

alter table public.vote_options enable row level security;

create policy "Participants can view vote options"
  on public.vote_options for select
  using (
    exists (
      select 1 from public.votes v
      join public.meeting_participants mp on mp.meeting_id = v.meeting_id
      where v.id = vote_options.vote_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Vote creators can insert options"
  on public.vote_options for insert
  with check (
    exists (
      select 1 from public.votes v
      where v.id = vote_options.vote_id
        and v.created_by = auth.uid()
    )
  );

-- ============================================================
-- vote_responses
-- ============================================================
create table if not exists public.vote_responses (
  id        uuid primary key default uuid_generate_v4(),
  vote_id   uuid not null references public.votes(id) on delete cascade,
  option_id uuid not null references public.vote_options(id) on delete cascade,
  user_id   uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (vote_id, user_id)
);

alter table public.vote_responses enable row level security;

create policy "Participants can view vote responses"
  on public.vote_responses for select
  using (
    exists (
      select 1 from public.votes v
      join public.meeting_participants mp on mp.meeting_id = v.meeting_id
      where v.id = vote_responses.vote_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Participants can insert vote responses once"
  on public.vote_responses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.votes v
      join public.meeting_participants mp on mp.meeting_id = v.meeting_id
      where v.id = vote_responses.vote_id
        and mp.user_id = auth.uid()
        and v.status = 'open'
    )
  );

-- ============================================================
-- decisions
-- ============================================================
create table if not exists public.decisions (
  id              uuid primary key default uuid_generate_v4(),
  meeting_id      uuid not null references public.meetings(id) on delete cascade,
  text            text not null,
  source_vote_id  uuid references public.votes(id),
  confirmed_by    uuid not null references public.profiles(id),
  created_at      timestamptz not null default now()
);

alter table public.decisions enable row level security;

create policy "Participants can view decisions"
  on public.decisions for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = decisions.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Hosts can create decisions"
  on public.decisions for insert
  with check (
    auth.uid() = confirmed_by
    and exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = decisions.meeting_id
        and mp.user_id = auth.uid()
        and mp.role = 'host'
    )
  );

-- ============================================================
-- tasks
-- ============================================================
create type public.task_status as enum ('todo', 'in_progress', 'done');

create table if not exists public.tasks (
  id                 uuid primary key default uuid_generate_v4(),
  meeting_id         uuid not null references public.meetings(id) on delete cascade,
  title              text not null,
  description        text not null default '',
  assignee_id        uuid references public.profiles(id),
  status             public.task_status not null default 'todo',
  source_decision_id uuid references public.decisions(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Participants can view tasks"
  on public.tasks for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = tasks.meeting_id
        and mp.user_id = auth.uid()
    )
  );

create policy "Hosts can create tasks"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = tasks.meeting_id
        and mp.user_id = auth.uid()
        and mp.role = 'host'
    )
  );

-- ============================================================
-- agent_events
-- ============================================================
create table if not exists public.agent_events (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  type        text not null,
  summary     text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.agent_events enable row level security;

create policy "Participants can view agent events"
  on public.agent_events for select
  using (
    exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = agent_events.meeting_id
        and mp.user_id = auth.uid()
    )
  );
