insert into storage.buckets (id, name, public)
values ('scorm-public', 'scorm-public', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view SCORM public files" on storage.objects;
create policy "Public can view SCORM public files"
on storage.objects
for select
to public
using (bucket_id = 'scorm-public');

drop policy if exists "Admins can upload SCORM public files" on storage.objects;
create policy "Admins can upload SCORM public files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'scorm-public' and public.is_admin(auth.uid()));

drop policy if exists "Admins can update SCORM public files" on storage.objects;
create policy "Admins can update SCORM public files"
on storage.objects
for update
to authenticated
using (bucket_id = 'scorm-public' and public.is_admin(auth.uid()))
with check (bucket_id = 'scorm-public' and public.is_admin(auth.uid()));

drop policy if exists "Admins can delete SCORM public files" on storage.objects;
create policy "Admins can delete SCORM public files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'scorm-public' and public.is_admin(auth.uid()));