-- Public bucket for merchant-uploaded widget / agent logos.
-- Objects live under `{user_id}/{agent_id}/logo.{ext}`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-logos',
  'agent-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read agent logos" on storage.objects;
create policy "Public read agent logos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'agent-logos');

drop policy if exists "Users insert own agent logo folder" on storage.objects;
create policy "Users insert own agent logo folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'agent-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own agent logo folder" on storage.objects;
create policy "Users update own agent logo folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'agent-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'agent-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own agent logo folder" on storage.objects;
create policy "Users delete own agent logo folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'agent-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
