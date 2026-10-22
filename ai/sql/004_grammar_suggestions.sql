-- Uiltje grammar suggestions (phase 9): users suggest grammar rules that should become standard in the app,
-- the owner accepts or rejects them, accepted ones show up for everyone in the "kies onderdelen" screen.
-- Run once in the Supabase SQL editor, after 001, 002 and 003. Safe to run again.
-- Same rule as before: nobody reads other people's rows directly, everything else goes through security-definer functions.
--
-- AFTER RUNNING: make yourself the owner. Find your user id (Authentication > Users in Supabase) and run:
--   insert into public.app_admins (user_id) values ('PASTE-YOUR-USER-ID-HERE') on conflict do nothing;

-- ---------------------------------------------------------------- who is the owner
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security;
-- No policies on purpose: nobody can read or change this table from the app. is_app_admin() below is the only way in.

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------- suggestions
create table if not exists public.grammar_suggestions (
  id uuid primary key default gen_random_uuid(),
  -- set null (not cascade): an accepted rule stays when its author deletes their account.
  user_id uuid references auth.users(id) on delete set null,
  subject text not null check (subject in ('Latijn', 'Grieks', 'Anders')),
  term text not null check (char_length(btrim(term)) between 1 and 80),
  definition text not null check (char_length(btrim(definition)) between 10 and 800),
  example text check (example is null or char_length(example) <= 400),
  example_translation text check (example_translation is null or char_length(example_translation) <= 400),
  source text check (source is null or char_length(source) <= 200),
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists grammar_suggestions_status_idx on public.grammar_suggestions (status, created_at);
create index if not exists grammar_suggestions_user_idx on public.grammar_suggestions (user_id, created_at);

alter table public.grammar_suggestions enable row level security;

-- You can send your own suggestions as "new", at most 20 per day.
drop policy if exists grammar_suggestions_insert on public.grammar_suggestions;
create policy grammar_suggestions_insert on public.grammar_suggestions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'new'
    and (
      select count(*) from public.grammar_suggestions s
      where s.user_id = auth.uid() and s.created_at > now() - interval '1 day'
    ) < 20
  );

-- You see your own suggestions; the owner sees all of them.
drop policy if exists grammar_suggestions_select on public.grammar_suggestions;
create policy grammar_suggestions_select on public.grammar_suggestions
  for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

-- You can withdraw a suggestion that is still new; the owner can remove any.
drop policy if exists grammar_suggestions_delete on public.grammar_suggestions;
create policy grammar_suggestions_delete on public.grammar_suggestions
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'new') or public.is_app_admin());

-- No update policy: the status only changes through review_grammar_suggestion().

-- ---------------------------------------------------------------- functions
-- Accepted rules for a subject, the same for every signed-in user, without the author.
create or replace function public.list_community_items(p_subject text)
returns table (id uuid, subject text, term text, definition text, example text, example_translation text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.subject, s.term, s.definition, s.example, s.example_translation
  from public.grammar_suggestions s
  where auth.uid() is not null and s.status = 'accepted' and s.subject = p_subject
  order by s.term;
$$;
revoke all on function public.list_community_items(text) from public, anon;
grant execute on function public.list_community_items(text) to authenticated;

-- Owner only: accept, reject or put back to new.
create or replace function public.review_grammar_suggestion(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_app_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('new', 'accepted', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.grammar_suggestions
     set status = p_status,
         reviewed_by = case when p_status = 'new' then null else auth.uid() end,
         reviewed_at = case when p_status = 'new' then null else now() end
   where id = p_id;
end;
$$;
revoke all on function public.review_grammar_suggestion(uuid, text) from public, anon;
grant execute on function public.review_grammar_suggestion(uuid, text) to authenticated;
