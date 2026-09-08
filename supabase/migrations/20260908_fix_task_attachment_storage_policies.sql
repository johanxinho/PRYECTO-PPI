drop policy if exists "task attachments own read" on storage.objects;
drop policy if exists "task attachments own insert" on storage.objects;
drop policy if exists "task attachments own delete" on storage.objects;
drop policy if exists "task attachments shared read" on storage.objects;

create policy "task attachments own read" on storage.objects
for select
using (
  bucket_id = 'task-attachments'
  and storage.foldername(name) @> ARRAY[auth.uid()::text]
);

create policy "task attachments own insert" on storage.objects
for insert
with check (
  bucket_id = 'task-attachments'
  and storage.foldername(name) @> ARRAY[auth.uid()::text]
);

create policy "task attachments own delete" on storage.objects
for delete
using (
  bucket_id = 'task-attachments'
  and storage.foldername(name) @> ARRAY[auth.uid()::text]
);

create policy "task attachments shared read" on storage.objects
for select
using (
  bucket_id = 'task-attachments'
  and exists (
    select 1
    from public.task_attachments attachment
    join public.task_shares share on share.task_id = attachment.task_id
    where attachment.storage_path = name
      and share.recipient_id = auth.uid()
  )
);
