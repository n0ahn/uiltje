-- Uiltje, challenges only count a test of the WHOLE set (run once in the Supabase SQL editor, after 005).
-- Before: the best test on the set counted, even a test of 10 of the 50 forms. Now a test has to ask every row of its kind
-- (no question limit, no picked terms, no lists left out). The app marks such a test with `whole_set` (and `test_kind`).
-- A set with both rijtjes and woorden/begrippen is practised in two different tests: then one whole-set test of each kind is
-- needed, and the challenge score is the total over the best whole-set test of each kind. Older tests have whole_set = false:
-- they no longer count (take the test again).
-- Safe to run again. Run it BEFORE using the new app version for tests (the app also saves without these columns if you forget).

alter table public.practice_sessions add column if not exists test_kind text check (test_kind is null or test_kind in ('rijtjes', 'woorden'));
alter table public.practice_sessions add column if not exists whole_set boolean not null default false;

-- Best whole-set result of one person on one set since a moment. Only called from list_challenges (not callable directly).
create or replace function public.challenge_best(p_user uuid, p_set uuid, p_since timestamptz, p_needed text[])
returns table (score numeric, grade numeric, taken_at timestamptz, kinds text[], partial boolean)
language sql stable security definer set search_path = '' as $$
  with best as (
    select distinct on (q.test_kind) q.test_kind, q.correct, q.total, q.ended_at
    from public.practice_sessions q
    where q.user_id = p_user and q.mode = 'test' and q.total > 0 and q.ended_at >= p_since
      and q.set_ids = array[p_set] and q.whole_set and q.test_kind is not null
    order by q.test_kind, q.correct::numeric / q.total desc, q.ended_at asc
  ), agg as (
    select array_agg(test_kind) as kinds, sum(correct) as c, sum(total) as t, max(ended_at) as latest from best
  )
  select case when a.kinds @> p_needed and a.t > 0 then a.c::numeric / a.t end,
         case when a.kinds @> p_needed and a.t > 0 then greatest(1, round(a.c::numeric / a.t * 100) / 10) end,
         case when a.kinds @> p_needed and a.t > 0 then a.latest end,
         coalesce(a.kinds, '{}'::text[]),
         exists (
           select 1 from public.practice_sessions q
           where q.user_id = p_user and q.mode = 'test' and q.total > 0 and q.ended_at >= p_since
             and q.set_ids = array[p_set] and not q.whole_set
         )
  from agg a;
$$;
revoke all on function public.challenge_best(uuid, uuid, timestamptz, text[]) from public, anon, authenticated;

drop function if exists public.list_challenges();
create or replace function public.list_challenges()
returns table (challenge_id uuid, set_title text, subject text, row_count int, i_am_challenger boolean, status text,
               created_at timestamptz, other_id uuid, other_name text, other_username text, other_avatar_path text,
               other_avatar_updated_at timestamptz, my_set_id uuid,
               my_score numeric, my_grade numeric, my_at timestamptz,
               their_score numeric, their_grade numeric, their_at timestamptz,
               needed_kinds text[], my_kinds text[], their_kinds text[], my_partial boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, s.title, s.subject, s.row_count, (c.challenger_id = auth.uid()), c.status, c.created_at,
         p.id, p.display_name, p.username, p.avatar_path, p.avatar_updated_at,
         case when c.challenger_id = auth.uid() then c.set_id else c.challenged_set_id end,
         mine.score, mine.grade, mine.taken_at, theirs.score, theirs.grade, theirs.taken_at,
         nk.kinds, coalesce(mine.kinds, '{}'::text[]), coalesce(theirs.kinds, '{}'::text[]), coalesce(mine.partial, false)
  from public.challenges c
  join public.sets s on s.id = c.set_id
  cross join lateral (
    -- Which kinds of practice the set has: words and begrippen ("woorden") or forms ("rijtjes"); empty lists do not count.
    select coalesce(array_agg(distinct case when l->>'kind' in ('vocab', 'concept') then 'woorden' else 'rijtjes' end), '{}'::text[]) as kinds
    from jsonb_array_elements(coalesce(s.data->'lists', '[]'::jsonb)) l
    where jsonb_array_length(coalesce(l->'rows', '[]'::jsonb)) > 0
  ) nk
  join public.profiles p on p.id = case when c.challenger_id = auth.uid() then c.challenged_id else c.challenger_id end
  left join lateral public.challenge_best(
    auth.uid(), case when c.challenger_id = auth.uid() then c.set_id else c.challenged_set_id end, c.created_at, nk.kinds
  ) mine on c.status = 'accepted'
  left join lateral public.challenge_best(
    case when c.challenger_id = auth.uid() then c.challenged_id else c.challenger_id end,
    case when c.challenger_id = auth.uid() then c.challenged_set_id else c.set_id end, c.created_at, nk.kinds
  ) theirs on c.status = 'accepted'
  where c.challenger_id = auth.uid() or c.challenged_id = auth.uid()
  order by c.created_at desc
  limit 50;
$$;
revoke all on function public.list_challenges() from public;
grant execute on function public.list_challenges() to authenticated;

notify pgrst, 'reload schema';
