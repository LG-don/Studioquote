-- StudioQuote — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Every row belongs to one signed-in user; Row Level Security makes sure
-- a studio can only ever read and write its own data.

-- Projects (each project is stored as one JSON document)
create table if not exists public.projects (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

-- Studio settings (one row per user)
create table if not exists public.studio_settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Rate library (one row per user, array of rates)
create table if not exists public.rate_libraries (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.projects        enable row level security;
alter table public.studio_settings enable row level security;
alter table public.rate_libraries  enable row level security;

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.studio_settings;
create policy "own settings" on public.studio_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rates" on public.rate_libraries;
create policy "own rates" on public.rate_libraries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- File storage: private bucket, files kept under <user_id>/<project_id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects
  for select using (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files insert" on storage.objects;
create policy "own files insert" on storage.objects
  for insert with check (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects
  for update using (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects
  for delete using (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);
