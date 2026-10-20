-- Uiltje phase 6: profile photo, friends, leaderboard, sharing (PLAN §4).
-- Run once in the Supabase SQL editor, after 001_persistence.sql. Safe to run again.
-- Everything social goes through security-definer RPCs: friends never get direct read access to each other's tables.

-- ---------------------------------------------------------------- profiles: photo, privacy, invite code
alter table public.profiles add column if not exists avatar_path        text;
alter table public.profiles add column if not exists avatar_updated_at  timestamptz;
alter table public.profiles add column if not exists show_on_leaderboard boolean not null default true;
alter table public.profiles add column if not exists friend_code        text;

update public.profiles set friend_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) where friend_code is null;
alter table public.profiles alter column friend_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
alter table public.profiles alter column friend_code set not null;
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_path_own_folder') then
    alter table public.profiles
      add constraint profiles_avatar_path_own_folder check (avatar_path is null or avatar_path like id::text || '/%');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_length') then
    alter table public.profiles add constraint profiles_display_name_length check (char_length(display_name) <= 40) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------- avatar bucket (the only file we store)
-- One small picture per user at <user id>/avatar.webp. The app shrinks it to 512 px first; the bucket refuses > 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars: read own"   on storage.objects;
drop policy if exists "avatars: insert own" on storage.objects;
drop policy if exists "avatars: update own" on storage.objects;
drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: read own"   on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- friendships
create table if not exists public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- One row per pair, whichever side asked first.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;
drop policy if exists "friendships: read own" on public.friendships;
create policy "friendships: read own" on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated; -- writes only through the functions below

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Relation of another user to the caller: none | friend | outgoing | incoming | self
create or replace function public.relation_to(other uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when other = auth.uid() then 'self'
    else coalesce((
      select case when f.status = 'accepted' then 'friend'
                  when f.requester_id = auth.uid() then 'outgoing'
                  else 'incoming' end
      from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = other)
         or (f.requester_id = other and f.addressee_id = auth.uid())
    ), 'none') end;
$$;
revoke all on function public.relation_to(uuid) from public;
grant execute on function public.relation_to(uuid) to anon, authenticated;

-- Find people by the start of their username (3+ characters).
create or replace function public.search_profiles(q text)
returns table (id uuid, username text, display_name text, avatar_path text, avatar_updated_at timestamptz, relation text)
language plpgsql stable security definer set search_path = '' as $$
declare needle text := lower(trim(q));
begin
  if auth.uid() is null or char_length(needle) < 3 then return; end if;
  needle := replace(replace(replace(needle, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.id, p.username, p.display_name, p.avatar_path, p.avatar_updated_at, public.relation_to(p.id)
    from public.profiles p
    where p.id <> auth.uid() and lower(p.username) like needle || '%'
    order by p.username
    limit 10;
end $$;
revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- Ask someone to be friends. If they already asked you, this accepts. Returns pending | accepted | exists | unknown | self.
create or replace function public.send_friend_request(target uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); rel text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if target = me then return 'self'; end if;
  if not exists (select 1 from public.profiles where id = target) then return 'unknown'; end if;
  rel := public.relation_to(target);
  if rel = 'incoming' then
    update public.friendships set status = 'accepted' where requester_id = target and addressee_id = me;
    return 'accepted';
  elsif rel in ('friend', 'outgoing') then
    return 'exists';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'pending';
end $$;
revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.respond_friend_request(requester uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if accept then
    update public.friendships set status = 'accepted'
    where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  end if;
end $$;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- Cancel a request you sent, or end a friendship (either side).
create or replace function public.remove_friendship(other uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = other) or (requester_id = other and addressee_id = auth.uid());
end $$;
revoke all on function public.remove_friendship(uuid) from public;
grant execute on function public.remove_friendship(uuid) to authenticated;

create or replace function public.list_friendships()
returns table (user_id uuid, username text, display_name text, avatar_path text, avatar_updated_at timestamptz,
               status text, incoming boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_path, p.avatar_updated_at,
         f.status, (f.addressee_id = auth.uid()), f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by p.display_name, p.username;
$$;
revoke all on function public.list_friendships() from public;
grant execute on function public.list_friendships() to authenticated;

-- ---------------------------------------------------------------- invite links (/i/<friend_code>)
create or replace function public.lookup_friend_code(code text)
returns table (id uuid, username text, display_name text, avatar_path text, avatar_updated_at timestamptz, relation text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_path, p.avatar_updated_at, public.relation_to(p.id)
  from public.profiles p where p.friend_code = code;
$$;
revoke all on function public.lookup_friend_code(text) from public;
grant execute on function public.lookup_friend_code(text) to anon, authenticated;

-- Opening an invite link makes you friends at once. Returns accepted | exists | unknown | self.
create or replace function public.add_friend_by_code(code text)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); target uuid; rel text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into target from public.profiles where friend_code = code;
  if target is null then return 'unknown'; end if;
  if target = me then return 'self'; end if;
  rel := public.relation_to(target);
  if rel = 'friend' then return 'exists'; end if;
  if rel = 'none' then
    insert into public.friendships (requester_id, addressee_id, status) values (target, me, 'accepted');
  else
    update public.friendships set status = 'accepted'
    where (requester_id = me and addressee_id = target) or (requester_id = target and addressee_id = me);
  end if;
  return 'accepted';
end $$;
revoke all on function public.add_friend_by_code(text) from public;
grant execute on function public.add_friend_by_code(text) to authenticated;

-- Old links stop working.
create or replace function public.regenerate_friend_code()
returns text language plpgsql security definer set search_path = '' as $$
declare fresh text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.profiles set friend_code = fresh where id = auth.uid();
  return fresh;
end $$;
revoke all on function public.regenerate_friend_code() from public;
grant execute on function public.regenerate_friend_code() to authenticated;

-- ---------------------------------------------------------------- leaderboard (aggregates only)
-- You plus your accepted friends who have not switched the leaderboard off. `p_since` is the start of the week or month
-- in the caller's time zone. practiced = answers given, correct = answers right without a hint.
create or replace function public.leaderboard(p_since timestamptz)
returns table (user_id uuid, username text, display_name text, avatar_path text, avatar_updated_at timestamptz,
               practiced bigint, correct bigint, sessions bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with circle as (
    select auth.uid() as uid
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  )
  select p.id, p.username, p.display_name, p.avatar_path, p.avatar_updated_at,
         coalesce(sum(s.total), 0)::bigint, coalesce(sum(s.correct), 0)::bigint, count(s.id)::bigint, p.id = auth.uid()
  from circle c
  join public.profiles p on p.id = c.uid
  left join public.practice_sessions s
         on s.user_id = p.id and s.ended_at >= greatest(p_since, now() - interval '400 days')
  where auth.uid() is not null and (p.id = auth.uid() or p.show_on_leaderboard)
  group by p.id;
$$;
revoke all on function public.leaderboard(timestamptz) from public;
grant execute on function public.leaderboard(timestamptz) to authenticated;

-- ---------------------------------------------------------------- sharing sets
-- Link: sets.share_token (null = not shared). Whoever has the link reads the set through get_shared_set and
-- saves their own independent copy (the app creates it with fresh ids).
create or replace function public.enable_set_share(p_set_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare token text;
begin
  update public.sets set share_token = coalesce(share_token, replace(gen_random_uuid()::text, '-', ''))
  where id = p_set_id and owner_id = auth.uid()
  returning share_token into token;
  if token is null then raise exception 'set not found'; end if;
  return token;
end $$;
revoke all on function public.enable_set_share(uuid) from public;
grant execute on function public.enable_set_share(uuid) to authenticated;

create or replace function public.disable_set_share(p_set_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.sets set share_token = null where id = p_set_id and owner_id = auth.uid();
$$;
revoke all on function public.disable_set_share(uuid) from public;
grant execute on function public.disable_set_share(uuid) to authenticated;

create or replace function public.get_shared_set(p_token text)
returns table (set_id uuid, title text, subject text, folder text, list_count int, row_count int, data jsonb,
               owner_name text, owner_username text, owner_avatar_path text, owner_avatar_updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.subject, s.folder, s.list_count, s.row_count, s.data,
         p.display_name, p.username, p.avatar_path, p.avatar_updated_at
  from public.sets s join public.profiles p on p.id = s.owner_id
  where s.share_token = p_token and p_token is not null and char_length(p_token) >= 16;
$$;
revoke all on function public.get_shared_set(text) from public;
grant execute on function public.get_shared_set(text) to anon, authenticated;

-- Send a set straight to a friend: it shows up in their "Gedeeld met jou" list.
create table if not exists public.set_shares (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  set_id       uuid not null references public.sets (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at   timestamptz not null default now(),
  unique (sender_id, recipient_id, set_id)
);
create index if not exists set_shares_recipient_idx on public.set_shares (recipient_id, status);
alter table public.set_shares enable row level security;
drop policy if exists "set_shares: read own" on public.set_shares;
create policy "set_shares: read own" on public.set_shares for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
revoke all on public.set_shares from anon, authenticated;
grant select on public.set_shares to authenticated;

create or replace function public.send_set_to_friend(p_set_id uuid, p_friend_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); share uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.sets where id = p_set_id and owner_id = me) then raise exception 'set not found'; end if;
  if not public.are_friends(me, p_friend_id) then raise exception 'not friends'; end if;
  insert into public.set_shares (sender_id, recipient_id, set_id) values (me, p_friend_id, p_set_id)
  on conflict (sender_id, recipient_id, set_id) do update set status = 'pending', created_at = now()
  returning id into share;
  return share;
end $$;
revoke all on function public.send_set_to_friend(uuid, uuid) from public;
grant execute on function public.send_set_to_friend(uuid, uuid) to authenticated;

create or replace function public.list_incoming_shares()
returns table (share_id uuid, set_title text, subject text, list_count int, row_count int,
               sender_id uuid, sender_name text, sender_username text, sender_avatar_path text,
               sender_avatar_updated_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.id, s.title, s.subject, s.list_count, s.row_count,
         p.id, p.display_name, p.username, p.avatar_path, p.avatar_updated_at, h.created_at
  from public.set_shares h
  join public.sets s on s.id = h.set_id
  join public.profiles p on p.id = h.sender_id
  where h.recipient_id = auth.uid() and h.status = 'pending'
  order by h.created_at desc;
$$;
revoke all on function public.list_incoming_shares() from public;
grant execute on function public.list_incoming_shares() to authenticated;

create or replace function public.get_incoming_share(p_share_id uuid)
returns table (set_id uuid, title text, subject text, folder text, list_count int, row_count int, data jsonb,
               owner_name text, owner_username text, owner_avatar_path text, owner_avatar_updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.subject, s.folder, s.list_count, s.row_count, s.data,
         p.display_name, p.username, p.avatar_path, p.avatar_updated_at
  from public.set_shares h
  join public.sets s on s.id = h.set_id
  join public.profiles p on p.id = h.sender_id
  where h.id = p_share_id and h.recipient_id = auth.uid() and h.status <> 'dismissed';
$$;
revoke all on function public.get_incoming_share(uuid) from public;
grant execute on function public.get_incoming_share(uuid) to authenticated;

create or replace function public.respond_set_share(p_share_id uuid, p_accept boolean)
returns void language sql security definer set search_path = '' as $$
  update public.set_shares set status = case when p_accept then 'accepted' else 'dismissed' end
  where id = p_share_id and recipient_id = auth.uid();
$$;
revoke all on function public.respond_set_share(uuid, boolean) from public;
grant execute on function public.respond_set_share(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
