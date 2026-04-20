update storage.buckets set public = false where id = 'scorm-public';

drop policy if exists "Public can view SCORM public files" on storage.objects;
drop policy if exists "Admins can upload SCORM public files" on storage.objects;
drop policy if exists "Admins can update SCORM public files" on storage.objects;
drop policy if exists "Admins can delete SCORM public files" on storage.objects;