-- ============================================================
-- AimLy — Habilitar Supabase Realtime
-- EJECUTAR DESPUÉS de haber corrido schema.sql
-- ============================================================

-- Agregar las tablas correctas a la publicación de Realtime
-- (los nombres reales según schema.sql son: chat_messages y board_cards)
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.board_cards;
alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.board_groups;
alter publication supabase_realtime add table public.agent_events;

-- Verificar que quedaron agregadas (deberías ver las tablas en el resultado)
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
