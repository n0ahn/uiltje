-- Uiltje phase 5: persistence (PLAN §4). Text/JSON only, no storage buckets.
-- Run once in the Supabase SQL editor. Safe to run again: everything is "if not exists" / "or replace".
-- Phase 6 adds: friendships, share-token RPC, leaderboard view.

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text,
  display_name text not null default '',
  avatar_color text,
  created_at   timestamptz not null default now()
);
-- In case a profiles table was created by hand earlier:
alter table public.profiles add column if not exists username     text;
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists avatar_color text;
alter table public.profiles add column if not exists created_at   timestamptz not null default now();

create unique index if not exists profiles_username_key on public.profiles (lower(username));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles
      add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$') not valid;
  end if;
end $$;

-- Picks a free username from sign-up metadata (email sign-up sends `username`, GitHub sends `user_name`).
create or replace function public.derive_username(meta jsonb, email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := coalesce(nullif(meta ->> 'username', ''), nullif(meta ->> 'user_name', ''),
                   nullif(meta ->> 'preferred_username', ''), split_part(coalesce(email, ''), '@', 1), '');
  base := regexp_replace(lower(base), '[^a-z0-9_]', '_', 'g');
  if length(base) < 3 then base := 'uil_' || base; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles p where lower(p.username) = candidate) loop
    n := n + 1;
    candidate := left(base, 20 - length(n::text) - 1) || '_' || n::text;
  end loop;
  return candidate;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uname text := public.derive_username(new.raw_user_meta_data, new.email);
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    uname,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
             uname)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that existed before this migration get a profile too.
do $$
declare u record;
begin
  for u in select id, email, raw_user_meta_data from auth.users
           where id not in (select id from public.profiles) loop
    insert into public.profiles (id, username, display_name)
    values (u.id, public.derive_username(u.raw_user_meta_data, u.email),
            coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
                     nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                     nullif(trim(u.raw_user_meta_data ->> 'name'), ''), ''));
  end loop;
end $$;

-- Profiles created by hand earlier without a username.
do $$
declare p record;
begin
  for p in select pr.id, u.email, u.raw_user_meta_data from public.profiles pr
           join auth.users u on u.id = pr.id where pr.username is null loop
    update public.profiles set username = public.derive_username(p.raw_user_meta_data, p.email) where id = p.id;
  end loop;
end $$;

-- Called by the login page (anonymous) before sign-up. Parameter must be called `name`.
create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles p where lower(p.username) = lower(trim(name)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

alter table public.profiles enable row level security;
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------- sets
create table if not exists public.sets (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  subject     text not null,
  folder      text,
  data        jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 2000000),
  list_count  int not null default 0,
  row_count   int not null default 0,
  share_token text unique,
  forked_from uuid references public.sets (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- In case a sets table was created by hand earlier (create-if-not-exists leaves it as it is):
alter table public.sets add column if not exists folder      text;
alter table public.sets add column if not exists list_count  int not null default 0;
alter table public.sets add column if not exists row_count   int not null default 0;
alter table public.sets add column if not exists share_token text;
alter table public.sets add column if not exists forked_from uuid;
alter table public.sets add column if not exists created_at  timestamptz not null default now();
alter table public.sets add column if not exists updated_at  timestamptz not null default now();
create index if not exists sets_owner_updated_idx on public.sets (owner_id, updated_at desc);

drop trigger if exists sets_updated_at on public.sets;
create trigger sets_updated_at before update on public.sets
  for each row execute function public.set_updated_at();

alter table public.sets enable row level security;
drop policy if exists "sets: read own"   on public.sets;
drop policy if exists "sets: insert own" on public.sets;
drop policy if exists "sets: update own" on public.sets;
drop policy if exists "sets: delete own" on public.sets;
create policy "sets: read own"   on public.sets for select to authenticated using (owner_id = (select auth.uid()));
create policy "sets: insert own" on public.sets for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "sets: update own" on public.sets for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "sets: delete own" on public.sets for delete to authenticated using (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.sets to authenticated;
-- Sharing by token (phase 6) will go through a security-definer RPC, not a public select policy.

-- ---------------------------------------------------------------- row_progress
create table if not exists public.row_progress (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_id    uuid not null references public.sets (id) on delete cascade,
  list_id   text not null,
  row_id    text not null,
  correct   int not null default 0 check (correct >= 0),
  wrong     int not null default 0 check (wrong >= 0),
  assisted  int not null default 0 check (assisted >= 0),
  streak    int not null default 0 check (streak >= 0),
  last_seen timestamptz not null default now(),
  primary key (user_id, set_id, list_id, row_id)
);
alter table public.row_progress add column if not exists assisted  int not null default 0;
alter table public.row_progress add column if not exists last_seen timestamptz not null default now();

alter table public.row_progress enable row level security;
drop policy if exists "row_progress: own" on public.row_progress;
create policy "row_progress: own" on public.row_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.row_progress to authenticated;

-- ---------------------------------------------------------------- practice_sessions
-- Phase 5 stores finished tests (TestRecord); phase 6 also records learn sessions here.
create table if not exists public.practice_sessions (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode             text not null check (mode in ('learn', 'test')),
  title            text not null default '',
  set_ids          uuid[] not null default '{}',
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  total            int not null default 0 check (total >= 0),
  correct          int not null default 0 check (correct >= 0 and correct <= total),
  grade            numeric(3, 1),
  passed           boolean,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  timed_out        boolean not null default false,
  wrong            jsonb not null default '[]' check (jsonb_typeof(wrong) = 'array')
);
alter table public.practice_sessions add column if not exists title            text not null default '';
alter table public.practice_sessions add column if not exists set_ids          uuid[] not null default '{}';
alter table public.practice_sessions add column if not exists grade            numeric(3,1);
alter table public.practice_sessions add column if not exists passed           boolean;
alter table public.practice_sessions add column if not exists duration_seconds int not null default 0;
alter table public.practice_sessions add column if not exists timed_out        boolean not null default false;
alter table public.practice_sessions add column if not exists wrong            jsonb not null default '[]';
create index if not exists practice_sessions_user_ended_idx on public.practice_sessions (user_id, ended_at desc);

alter table public.practice_sessions enable row level security;
drop policy if exists "practice_sessions: own" on public.practice_sessions;
create policy "practice_sessions: own" on public.practice_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.practice_sessions to authenticated;

-- ---------------------------------------------------------------- user_settings
create table if not exists public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
drop policy if exists "user_settings: own" on public.user_settings;
create policy "user_settings: own" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.user_settings to authenticated;

-- Make the API pick up new columns right away.
notify pgrst, 'reload schema';
