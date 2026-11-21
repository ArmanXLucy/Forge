-- Run in the Supabase SQL editor after creating the project.
-- Profile images are public-read (needed for direct <img> URLs) and
-- owner-write. The preferred upload path is the profile-image Edge Function,
-- which verifies the Firebase ID token and uses the service role server-side.

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Profile images are publicly readable" on storage.objects;
create policy "Profile images are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-images');

-- Direct browser uploads only work when Supabase is configured for Firebase
-- third-party auth. Storage policies evaluate the Firebase JWT `sub` claim.
drop policy if exists "Users upload their own profile images" on storage.objects;
create policy "Users upload their own profile images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'sub', auth.uid()::text)
);

drop policy if exists "Users replace their own profile images" on storage.objects;
create policy "Users replace their own profile images"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'sub', auth.uid()::text)
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'sub', auth.uid()::text)
);

drop policy if exists "Users delete their own profile images" on storage.objects;
create policy "Users delete their own profile images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = coalesce(auth.jwt() ->> 'sub', auth.uid()::text)
);
