-- VELYRA Control — apply only on a dedicated Supabase project.
-- Create Auth users manually in Dashboard > Authentication > Users.
-- After creating your admin user, manually insert that UUID into velyra_admins.
begin;
create table if not exists public.velyra_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.velyra_admins enable row level security;
revoke all on public.velyra_admins from anon, authenticated;
grant select on public.velyra_admins to authenticated;
create policy "velyra_admin_self_read" on public.velyra_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.velyra_profiles (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('streamer','manager')),
  name text not null check(char_length(name) between 1 and 100),
  handle text check(char_length(handle) <= 80),
  role text check(char_length(role) <= 100),
  bio text check(char_length(bio) <= 1200),
  photo_url text,
  twitch_url text,
  kick_url text,
  youtube_url text,
  tiktok_url text,
  instagram_url text,
  contact_url text,
  sort_order integer not null default 0 check (sort_order between 0 and 100000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists velyra_profiles_public_idx on public.velyra_profiles(kind, sort_order) where published=true;
alter table public.velyra_profiles enable row level security;
revoke all on public.velyra_profiles from anon, authenticated;
grant select on public.velyra_profiles to anon, authenticated;
grant insert, update, delete on public.velyra_profiles to authenticated;
create policy "velyra_profiles_public_read" on public.velyra_profiles
  for select to anon, authenticated using (published=true);
create policy "velyra_profiles_admin_read" on public.velyra_profiles
  for select to authenticated using (
    exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
create policy "velyra_profiles_admin_insert" on public.velyra_profiles
  for insert to authenticated with check (
    exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
create policy "velyra_profiles_admin_update" on public.velyra_profiles
  for update to authenticated using (
    exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  ) with check (
    exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
create policy "velyra_profiles_admin_delete" on public.velyra_profiles
  for delete to authenticated using (
    exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
create or replace function public.velyra_touch_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
create trigger velyra_profiles_touched before update on public.velyra_profiles
  for each row execute function public.velyra_touch_updated_at();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('velyra-portraits','velyra-portraits',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy "velyra_upload_admin_only" on storage.objects
  for insert to authenticated with check (
    bucket_id='velyra-portraits'
    and storage.extension(name) in ('jpg','png','webp')
    and exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
create policy "velyra_remove_upload_admin_only" on storage.objects
  for delete to authenticated using (
    bucket_id='velyra-portraits'
    and exists(select 1 from public.velyra_admins a where a.user_id=(select auth.uid()))
  );
commit;

-- After creating an authenticated VELYRA admin user in the Supabase dashboard:
-- insert into public.velyra_admins(user_id) values ('REPLACE-WITH-AUTH-USER-UUID');
-- Do not grant INSERT/UPDATE/DELETE on velyra_admins to public clients.
