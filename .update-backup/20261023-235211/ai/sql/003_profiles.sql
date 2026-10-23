-- Uiltje social update: public/private sets, friend profiles, delete account.
-- Run once in the Supabase SQL editor, after 001 and 002. Safe to run again.
-- Same rule as before: friends never read each other's tables, everything goes through security-definer RPCs.

-- ---------------------------------------------------------------- sets: public (visible to friends) or private
alter table public.sets add column if not exists is_public boolean not null default false;

-- ---------------------------------------------------------------- profile of yourself or of a friend
-- Returns null when the caller is neither that person nor a friend. Stats are null when the person switched
-- "show on leaderboard" off (that switch now covers the profile statistics too). Friends only get public sets.
create or replace function public.get_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.profiles%rowtype;
  is_self boolean;
  stats_visible boolean;
  stats jsonb := null;
  activity jsonb := '[]'::jsonb;
  sets_json jsonb;
begin
  if me is null then return null; end if;
  select * into p from public.profiles where lower(username) = lower(trim(p_username));
  if not found then return null; end if;
  is_self := p.id = me;
  if not is_self and not public.are_friends(me, p.id) then return null; end if;
  stats_visible := is_self or p.show_on_leaderboard;

  if stats_visible then
    select jsonb_build_object(
      'answers',  coalesce(sum(total), 0),
      'correct',  coalesce(sum(correct), 0),
      'sessions', count(*) filter (where total > 0),
      'tests',    count(*) filter (where mode = 'test'),
      'mastered', (select count(*) from public.row_progress r where r.user_id = p.id and r.streak >= 2)
    ) into stats
    from public.practice_sessions where user_id = p.id;

    select coalesce(jsonb_agg(ms order by ms desc), '[]'::jsonb) into activity from (
      select (extract(epoch from ended_at) * 1000)::bigint as ms
      from public.practice_sessions
      where user_id = p.id and total > 0 and ended_at >= now() - interval '120 days'
      order by ended_at desc limit 1000
    ) a;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'title', s.title, 'subject', s.subject, 'list_count', s.list_count,
      'row_count', s.row_count, 'is_public', s.is_public,
      'updated_at', s.updated_at) order by s.updated_at desc), '[]'::jsonb)
  into sets_json
  from public.sets s
  where s.owner_id = p.id and (is_self or s.is_public);

  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name,
    'avatar_path', p.avatar_path, 'avatar_updated_at', p.avatar_updated_at,
    'created_at', p.created_at, 'is_self', is_self,
    'stats', stats, 'activity', activity, 'sets', sets_json
  );
end $$;
revoke all on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to authenticated;

-- ---------------------------------------------------------------- read a public set of a friend (or your own)
create or replace function public.get_public_set(p_set_id uuid)
returns table (set_id uuid, title text, subject text, folder text, list_count int, row_count int, data jsonb,
               owner_name text, owner_username text, owner_avatar_path text, owner_avatar_updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.subject, s.folder, s.list_count, s.row_count, s.data,
         p.display_name, p.username, p.avatar_path, p.avatar_updated_at
  from public.sets s join public.profiles p on p.id = s.owner_id
  where s.id = p_set_id and auth.uid() is not null
    and (s.owner_id = auth.uid() or (s.is_public and public.are_friends(auth.uid(), s.owner_id)));
$$;
revoke all on function public.get_public_set(uuid) from public;
grant execute on function public.get_public_set(uuid) to authenticated;

-- ---------------------------------------------------------------- delete your own account
-- Removes the auth user; every table references auth.users with "on delete cascade" (profile, sets, progress,
-- sessions, settings, friendships, shares). The profile photo is removed by the app first (storage objects cannot
-- be deleted from SQL).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
