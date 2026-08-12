-- Run once in the Supabase SQL Editor. Images are stored outside the API
-- process so a small Render instance is never asked to keep base64 blobs.
insert into storage.buckets (id, name, public)
values ('whiteboard-files', 'whiteboard-files', true)
on conflict (id) do nothing;

drop policy if exists "Meeting participants upload whiteboard files" on storage.objects;
create policy "Meeting participants upload whiteboard files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'whiteboard-files'
    and exists (
      select 1 from public.meeting_participants mp
      where mp.meeting_id = (storage.foldername(name))[1]::uuid
        and mp.user_id = auth.uid()
    )
  );

-- Existing JSON scenes may contain old base64 payloads. Remove them to prevent
-- memory-heavy responses. Those old image pixels cannot be recovered because
-- they were never placed in durable object storage.
update public.excalidraw_scenes
set files = coalesce((
  select jsonb_object_agg(key, value - 'dataURL')
  from jsonb_each(files)
), '{}'::jsonb)
where files <> '{}'::jsonb;
