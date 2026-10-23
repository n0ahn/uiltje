-- Uiltje "Uitleggen" disputes: a learner disagrees with the AI's verdict on their explanation and sends it to the owner.
-- Run once in the Supabase SQL editor, after 004 (it uses is_app_admin()). Safe to run again.

create table if not exists public.explain_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ref text check (ref is null or char_length(ref) <= 120),
  term text not null check (char_length(btrim(term)) between 1 and 120),
  reference text not null check (char_length(reference) <= 1500),
  answer text not null check (char_length(answer) <= 1500),
  ai_verdict text not null check (ai_verdict in ('goed', 'bijna', 'niet')),
  ai_feedback text check (ai_feedback is null or char_length(ai_feedback) <= 600),
  note text check (note is null or char_length(note) <= 600),
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists explain_disputes_status_idx on public.explain_disputes (status, created_at);
create index if not exists explain_disputes_user_idx on public.explain_disputes (user_id, created_at);

alter table public.explain_disputes enable row level security;

-- Only the owner reads and changes the table directly. Learners send through the function below.
drop policy if exists explain_disputes_owner on public.explain_disputes;
create policy explain_disputes_owner on public.explain_disputes
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- At most 30 disputes per user per day.
create or replace function public.submit_explain_dispute(
  p_ref text, p_term text, p_reference text, p_answer text, p_verdict text, p_feedback text, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.explain_disputes d
       where d.user_id = auth.uid() and d.created_at > now() - interval '1 day') >= 30 then
    raise exception 'limit' using errcode = '42501';
  end if;
  insert into public.explain_disputes (user_id, ref, term, reference, answer, ai_verdict, ai_feedback, note)
  values (auth.uid(), nullif(btrim(coalesce(p_ref, '')), ''), btrim(p_term), p_reference, p_answer, p_verdict,
          nullif(btrim(coalesce(p_feedback, '')), ''), nullif(btrim(coalesce(p_note, '')), ''));
end;
$$;
revoke all on function public.submit_explain_dispute(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_explain_dispute(text, text, text, text, text, text, text) to authenticated;
