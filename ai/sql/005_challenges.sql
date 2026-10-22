-- Uiltje, challenges (run once in the Supabase SQL editor, after 001 to 004).
-- A challenge: you pick one of your sets and a friend. The friend looks at the set, makes an own copy and takes a test
-- on it. Scores are compared per person: the best test (correct / total) on the set taken after the challenge was sent.
-- Nothing here is readable directly: everything goes through the security-definer functions below, which only ever show
-- the two people in a challenge each other's best score (no answers, no other sessions).

create table if not exists public.challenges (
  id                uuid primary key default gen_random_uuid(),
  challenger_id     uuid not null references auth.users (id) on delete cascade,
  challenged_id     uuid not null references auth.users (id) on delete cascade,
  set_id            uuid not null references public.sets (id) on delete cascade,
  challenged_set_id uuid references public.sets (id) on delete set null,
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at        timestamptz not null default now(),
  check (challenger_id <> challenged_id),
  unique (challenger_id, challenged_id, set_id)
);
create index if not exists challenges_challenged_idx on public.challenges (challenged_id, status);
create index if not exists challenges_challenger_idx on public.challenges (challenger_id);

alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

-- Send (or send again: the old scores stop counting, the friend gets a fresh invitation).
create or replace function public.send_challenge(p_set_id uuid, p_friend_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); cid uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.sets where id = p_set_id and owner_id = me and row_count > 0) then raise exception 'set not found'; end if;
  if not public.are_friends(me, p_friend_id) then raise exception 'not friends'; end if;
  insert into public.challenges (challenger_id, challenged_id, set_id)
  values (me, p_friend_id, p_set_id)
  on conflict (challenger_id, challenged_id, set_id)
  do update set status = 'pending', challenged_set_id = null, created_at = now()
  returning id into cid;
  return cid;
end $$;
revoke all on function public.send_challenge(uuid, uuid) from public;
grant execute on function public.send_challenge(uuid, uuid) to authenticated;

-- My challenges (sent and received) with both best scores. A score is the best finished test on exactly this set
-- (not a combined test) that ended after the challenge was sent.
create or replace function public.list_challenges()
returns table (challenge_id uuid, set_title text, subject text, row_count int, i_am_challenger boolean, status text,
               created_at timestamptz, other_id uuid, other_name text, other_username text, other_avatar_path text,
               other_avatar_updated_at timestamptz, my_set_id uuid,
               my_score numeric, my_grade numeric, my_at timestamptz,
               their_score numeric, their_grade numeric, their_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, s.title, s.subject, s.row_count, (c.challenger_id = auth.uid()), c.status, c.created_at,
         p.id, p.display_name, p.username, p.avatar_path, p.avatar_updated_at,
         case when c.challenger_id = auth.uid() then c.set_id else c.challenged_set_id end,
         mine.score, mine.grade, mine.at, theirs.score, theirs.grade, theirs.at
  from public.challenges c
  join public.sets s on s.id = c.set_id
  join public.profiles p on p.id = case when c.challenger_id = auth.uid() then c.challenged_id else c.challenger_id end
  left join lateral (
    select (q.correct::numeric / q.total) as score, q.grade, q.ended_at as at
    from public.practice_sessions q
    where q.user_id = auth.uid() and q.mode = 'test' and q.total > 0 and q.ended_at >= c.created_at
      and q.set_ids = array[case when c.challenger_id = auth.uid() then c.set_id else c.challenged_set_id end]
    order by q.correct::numeric / q.total desc, q.ended_at asc limit 1
  ) mine on c.status = 'accepted'
  left join lateral (
    select (q.correct::numeric / q.total) as score, q.grade, q.ended_at as at
    from public.practice_sessions q
    where q.user_id = (case when c.challenger_id = auth.uid() then c.challenged_id else c.challenger_id end)
      and q.mode = 'test' and q.total > 0 and q.ended_at >= c.created_at
      and q.set_ids = array[case when c.challenger_id = auth.uid() then c.challenged_set_id else c.set_id end]
    order by q.correct::numeric / q.total desc, q.ended_at asc limit 1
  ) theirs on c.status = 'accepted'
  where c.challenger_id = auth.uid() or c.challenged_id = auth.uid()
  order by c.created_at desc
  limit 50;
$$;
revoke all on function public.list_challenges() from public;
grant execute on function public.list_challenges() to authenticated;

-- The set of a challenge that was sent to me (to look at it and make a copy).
create or replace function public.get_challenge_set(p_id uuid)
returns table (set_id uuid, title text, subject text, folder text, list_count int, row_count int, data jsonb,
               owner_name text, owner_username text, owner_avatar_path text, owner_avatar_updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.subject, s.folder, s.list_count, s.row_count, s.data,
         p.display_name, p.username, p.avatar_path, p.avatar_updated_at
  from public.challenges c
  join public.sets s on s.id = c.set_id
  join public.profiles p on p.id = c.challenger_id
  where c.id = p_id and c.challenged_id = auth.uid() and c.status <> 'declined';
$$;
revoke all on function public.get_challenge_set(uuid) from public;
grant execute on function public.get_challenge_set(uuid) to authenticated;

-- Accept (with the id of the copy the app just made in my account) or decline.
create or replace function public.respond_challenge(p_id uuid, p_accept boolean, p_copy_set_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_accept then
    if p_copy_set_id is null or not exists (select 1 from public.sets where id = p_copy_set_id and owner_id = me) then
      raise exception 'copy not found';
    end if;
    update public.challenges set status = 'accepted', challenged_set_id = p_copy_set_id
    where id = p_id and challenged_id = me and status = 'pending';
  else
    update public.challenges set status = 'declined' where id = p_id and challenged_id = me and status = 'pending';
  end if;
end $$;
revoke all on function public.respond_challenge(uuid, boolean, uuid) from public;
grant execute on function public.respond_challenge(uuid, boolean, uuid) to authenticated;

-- The challenger can withdraw a challenge; both sides can remove a finished one from their list.
create or replace function public.delete_challenge(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.challenges where id = p_id and (challenger_id = auth.uid() or challenged_id = auth.uid());
$$;
revoke all on function public.delete_challenge(uuid) from public;
grant execute on function public.delete_challenge(uuid) to authenticated;

notify pgrst, 'reload schema';
