-- Uiltje 008: (1) approved questions also hand out their explanation, so it can be shown after a wrong answer;
-- (2) a learner can see that the owner handled their "Uitleggen" dispute. Run once in the Supabase SQL editor, after 006 and 007.
-- Safe to run again.

-- ---------------------------------------------------------------- (1) approved questions with their explanation
drop function if exists public.list_approved_questions(text);
create function public.list_approved_questions(p_prefix text)
returns table (id uuid, ref text, kind text, prompt text, translation text, explanation text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.ref, q.kind, q.prompt, q.translation, q.explanation
  from public.grammar_questions q
  where auth.uid() is not null
    and q.status = 'approved'
    and starts_with(q.ref, p_prefix)
  order by q.ref, q.created_at
  limit 2000;
$$;
revoke all on function public.list_approved_questions(text) from public, anon;
grant execute on function public.list_approved_questions(text) to authenticated;

-- ---------------------------------------------------------------- (2) answers to your own disputes
-- Only your own, only handled ones from the last 30 days, and only what the notification needs.
create or replace function public.list_my_dispute_replies()
returns table (id uuid, term text, status text, reviewed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.term, d.status, d.reviewed_at
  from public.explain_disputes d
  where d.user_id = auth.uid()
    and d.status in ('accepted', 'rejected')
    and d.reviewed_at is not null
    and d.reviewed_at > now() - interval '30 days'
  order by d.reviewed_at desc
  limit 20;
$$;
revoke all on function public.list_my_dispute_replies() from public, anon;
grant execute on function public.list_my_dispute_replies() to authenticated;
