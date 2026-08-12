-- Run this after 20260811_whiteboard_storage.sql in the Supabase SQL Editor.
-- Storage policies cannot reliably query an RLS-protected participants table
-- directly. This helper evaluates membership with definer privileges.
create or replace function public.can_access_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.meetings m
    where m.id = target_meeting_id and m.host_id = auth.uid()
  ) or exists (
    select 1 from public.meeting_participants mp
    where mp.meeting_id = target_meeting_id and mp.user_id = auth.uid()
  );
$$;

grant execute on function public.can_access_meeting(uuid) to authenticated;

drop policy if exists "Meeting participants upload whiteboard files" on storage.objects;
create policy "Meeting participants upload whiteboard files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'whiteboard-files'
    and public.can_access_meeting((storage.foldername(name))[1]::uuid)
  );

-- Needed if a retry encounters an existing object with the same id.
drop policy if exists "Meeting participants update whiteboard files" on storage.objects;
create policy "Meeting participants update whiteboard files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'whiteboard-files'
    and public.can_access_meeting((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'whiteboard-files'
    and public.can_access_meeting((storage.foldername(name))[1]::uuid)
  );
