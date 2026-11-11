-- Per-restaurant custom sound for staff order notifications.
alter table public.restaurants
  add column if not exists notification_sound_url text;

insert into storage.buckets (id, name, public)
values ('settings', 'settings', true)
on conflict (id) do update set public = true;

drop policy if exists "public read settings sounds" on storage.objects;
create policy "public read settings sounds"
  on storage.objects for select
  using (bucket_id = 'settings');

drop policy if exists "staff upload settings sounds" on storage.objects;
create policy "staff upload settings sounds"
  on storage.objects for insert
  with check (
    bucket_id = 'settings'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "staff update settings sounds" on storage.objects;
create policy "staff update settings sounds"
  on storage.objects for update
  using (
    bucket_id = 'settings'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'settings'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "staff delete settings sounds" on storage.objects;
create policy "staff delete settings sounds"
  on storage.objects for delete
  using (
    bucket_id = 'settings'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );

notify pgrst, 'reload schema';
