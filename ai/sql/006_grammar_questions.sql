-- Uiltje question bank (phase 9): extra practice questions written by the AI around items of the syllabus catalogue,
-- checked by a second AI pass, approved by the owner. Plus: the owner can edit a suggestion before accepting it.
-- Run once in the Supabase SQL editor, after 004 (it uses is_app_admin()). Safe to run again.
-- Same rule as before: users never read the table directly. They get approved questions through a function.

-- ---------------------------------------------------------------- the questions
-- The ANSWER is not stored: it is the catalogue term of `ref` (e.g. 'ltc-2027/litotes'), resolved in the app code,
-- so every answer comes from the syllabus and an AI can never put a wrong answer in the database.
create table if not exists public.grammar_questions (
  id uuid primary key default gen_random_uuid(),
  ref text not null check (char_length(ref) between 3 and 120),
  kind text not null check (kind in ('sentence', 'paraphrase')),
  prompt text not null check (char_length(btrim(prompt)) between 5 and 600),
  translation text check (translation is null or char_length(translation) <= 600),
  explanation text check (explanation is null or char_length(explanation) <= 600),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  -- result of the second AI pass: true = ok, false = doubt or wrong, null = not checked
  check_ok boolean,
  check_note text check (check_note is null or char_length(check_note) <= 400),
  model text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists grammar_questions_ref_idx on public.grammar_questions (ref, status);
create index if not exists grammar_questions_status_idx on public.grammar_questions (status, created_at);

alter table public.grammar_questions enable row level security;

-- Only the owner reads and writes the table directly.
drop policy if exists grammar_questions_owner on public.grammar_questions;
create policy grammar_questions_owner on public.grammar_questions
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- ---------------------------------------------------------------- approved questions for everyone
-- p_prefix is a catalogue id with a slash, e.g. 'ltc-2027/'. Approved questions only, no notes, no author.
create or replace function public.list_approved_questions(p_prefix text)
returns table (id uuid, ref text, kind text, prompt text, translation text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.ref, q.kind, q.prompt, q.translation
  from public.grammar_questions q
  where auth.uid() is not null
    and q.status = 'approved'
    and starts_with(q.ref, p_prefix)
  order by q.ref, q.created_at
  limit 2000;
$$;
revoke all on function public.list_approved_questions(text) from public, anon;
grant execute on function public.list_approved_questions(text) to authenticated;

-- ---------------------------------------------------------------- the owner edits a suggestion before accepting it
create or replace function public.update_grammar_suggestion(
  p_id uuid, p_term text, p_definition text, p_example text, p_example_translation text, p_source text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.grammar_suggestions
     set term = btrim(p_term),
         definition = btrim(p_definition),
         example = nullif(btrim(coalesce(p_example, '')), ''),
         example_translation = nullif(btrim(coalesce(p_example_translation, '')), ''),
         source = nullif(btrim(coalesce(p_source, '')), '')
   where id = p_id;
end;
$$;
revoke all on function public.update_grammar_suggestion(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.update_grammar_suggestion(uuid, text, text, text, text, text) to authenticated;
