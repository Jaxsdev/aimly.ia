-- Run once in the Supabase SQL Editor.
-- Enables database-change events as a fallback for sticky notes.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'board_cards'
  ) then
    alter publication supabase_realtime add table public.board_cards;
  end if;
end $$;
