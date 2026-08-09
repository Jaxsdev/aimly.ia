-- ============================================================
-- AimLy — Verificar que las tablas existen
-- ============================================================

-- Ver todas las tablas del proyecto
select table_name 
from information_schema.tables 
where table_schema = 'public'
order by table_name;
