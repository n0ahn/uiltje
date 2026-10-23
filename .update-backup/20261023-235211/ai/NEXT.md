# NEXT.md — Uiltje

Snapshot of what to do next, derived from TODO.md, NOTES.md and the code in `src/` (updated 2026-10-22, phase 8 tried and working, phase 9 started). Update this file when the next steps change. Waiting for instructions before starting any of these.

## Current state

- Phases 0 to 5 are complete in code (phase 5 not yet run against the real Supabase project, see below), except the AI-driven "Grammatica & stijl" templates (stay "Binnenkort" until phase 9).
- Practice works in blocks for one set (`/sets/[id]/practice`) and for all sets of a subject (`/vak/[subject]/practice`): learn and test mode, step-back, strictness, retest of mistakes, side panel, shortcuts (Enter, Tab, Alt+H, Alt+Enter), sound and confetti.
- Set page `/sets/[id]`: StudyGo-style overview (all lists and rows, mastery dots, progress bar) with an "Oefenen" dropdown (Leren, Toets live; Dictee, Spelling, Hints, Meerkeuze, Flashcards are "Binnenkort"), Bewerken and a ⋮ menu (export JSON, delete). `/sets` cards link to it. The practice menu passes `?mode=learn|test` to the practice route.
- Vocab ("woorden") practice is separate from rijtjes: `engine/vocab.ts` (`VocabSession`, `VocabTest`) and `VocabRunner.svelte`. Learn = rounds of 5 words: intro, multiple choice, typed, typed again later; a miss goes back to level 1 and returns soon (retype the answer to continue); hint-correct does not progress; final review; words with streak >= 2 are skipped. The start screen shows a Rijtjes/Woorden switch when a selection has both kinds, and `PracticeConfig.kind` picks the runner. The algorithm is modelled on Quizlet Learn and StudyGo "Leren", not copied: neither publishes the exact rules.
- Sound: `audio/clicks.ts` plays a quiet click on every button, link and switch (one delegated listener installed in the root layout, silenced by `data-sfx="off"`, mute setting respected).
- UI polish: icons via `@lucide/svelte` (`npm i @lucide/svelte`, wrapped in `ui/Icon.svelte`), dropdowns in the top layer, `scrollbar-gutter: stable`, fixed `max-w-3xl` for focused pages, reserved status slots in the runners, tactile synthesized sounds. See the new UX lines in RULES.md.
- Editor decluttered: ⋮ menus (JSON, paste, tags, delete), list kind/group under "Meer instellingen", tags and dimensions hidden until asked for and never shown for vocab lists.
- Test system: every form once, optional time limit, optional fixed number of forms, grade (10 x score, passed from 5,5 = 55%), results stored locally (last 50).
- `/vakken`, `/vak/[subject]` and `/settings` exist. Settings (level, practice defaults, grade, sound) go through `StorageAdapter`.
- Phase 5: `ai/sql/001_persistence.sql` (run it once in the Supabase SQL editor), `storage/supabase.ts` (full `StorageAdapter`), `getStorage()` switches on the session (guest = localStorage), guest → account import (dialog after login, card on `/settings`), logout on `/settings`. Verified with svelte-check, an in-memory fake client and the SQL in PGlite; NOT yet run against the real project and real browser.
- Phase 9: stijlfiguren/grammatica templates, picker and suggestions are in code (NOTES "Phase 9 stijlfiguren, grammatica and suggestions"); SQL 004 still to run, owner to be set. Generated example sentences + approval screen are the next part.
- Phase 9 started: verified grammar catalogue from the 2027 LTC syllabus is in `lib/grammar/` (data only, no UI yet). Latin and Greek catalogues done; owner approved the strategy (owner-only approval for now).
- Phase 8 AI import is in code (NOTES "Phase 8 AI import"): `/sets/ai`, `/api/ai/import`, entry points on `/sets` and the empty editor. Needs `GEMINI_API_KEY` (and ideally `GEMINI_MODELS`) in `.env` and on Vercel; not yet run against the real Gemini API or in a browser.
- Phase 7 is mostly done (sfx, confetti, themes, mobile pass, animations; NOTES "Phase 7 polish"). Phases 9 and 10 are not started.
- Verified in a scratch SvelteKit 3 project (`svelte-check` clean, build ok, engine scenarios, browser checks incl. vocab learn/test and the set page). Not yet run in the real repo.
- Dashboard (hero, subjects, recent sets, streak) and `/stats` use real data (session log, see NOTES Phase 6). The friends card shows the real week top 3.
- Phase 6 social is in code (NOTES "Phase 6 social"): `/profile` with photo upload, `/friends`, `/leaderboard`, `/i/[code]`, `/s/[token]`, `/gedeeld/[id]`, share dialog on `/sets/[id]`. SQL: `ai/sql/002_social.sql` (run once after 001). Verified in PGlite (RLS, RPCs, opt-out, share on/off); NOT yet run against the real project or in a browser.

- Skeleton loading is on every page (see NOTES "Skeleton loading"); not yet seen in the real browser: check light/dark, 390px and reduced motion.

- Login page redesigned, guest login button and owl favicon added (see NOTES "Login redesign + favicon"); not yet seen in a browser.

- Meldingen (bell, live friend requests/shares, local tips and milestones) added; see NOTES "Meldingen". Not yet seen in a browser. Phones only have the bell on the dashboard.

- Social update (profiles): see NOTES "Social update". `/profile` is now the own profile page, editing lives in `/settings?tab=profiel`; `/u/[username]` shows a friend; sets can be public (friends) or private. SQL `003_profiles.sql` must be run. Not yet seen in a browser.

## Next steps (in order)

0b. **Try the Greek keyboard** (NOTES "Greek keyboard per set"): new set -> Toetsenbord Grieks, type rows, practise in learn/test/cards; run `npm run check`.

0. **Run `ai/sql/003_profiles.sql`**, then try with two accounts: set a set to Openbaar in the editor, open the friend's profile, copy the set, switch statistics off, delete a test account.

1. **Try phase 5 for real.** Run the SQL, sign up (email + GitHub), create a set, practice, do a test, log out and in, import guest data. Fix whatever the real project shows (see the Phase 5 notes in NOTES.md).
4. **Check phase 6 stats in the real app** (practice a few blocks, look at `/stats` and the dashboard, tune definitions in `stats/stats.ts`).
5. **Try phase 6 social for real.** Run `002_social.sql`, make two accounts, upload a photo, add each other (search and invite link), practise, check `/leaderboard`, share a set by link and to a friend, switch the leaderboard off. Check the `avatars` bucket is public in the dashboard.
6. **Phase 7 rest.** Look at the new themes, animations and phone layout on a real phone; practice screens, editor and set page still need a phone pass with the new type scale. Tweak `--text-sm` or the spring easing if something feels off.
7. **Try phase 8 for real.** Create a key in Google AI Studio, put `GEMINI_API_KEY` (and `GEMINI_MODELS`, names from AI Studio) in `.env` and Vercel, log in, open `/sets/ai`, try a photo of a Latin table, a Greek table and a vocab list, plus pasted text. Check accents, tags/stages on declensions, the review screen on a phone. Tune the `SYSTEM` prompt in `server/ai/import.ts` and the default model list.
8. **Try phase 9 for real.** Run `ai/sql/004_grammar_suggestions.sql`, add yourself to `app_admins`, make a Stijlfiguren set (Latijn and Grieks), practise it (multiple choice and typed), send a suggestion, accept it on /suggesties and see it in the picker. Then: generated example sentences + owner approval screen (stijlfiguren first).
9.  **Vocab polish.** Try the learn flow with real classmates' sets and tune `roundSize`, spacing and distractor choice in `engine/vocab.ts`. The Meerkeuze, Flashcards, Dictee, Spelling and Hints modes exist now (NOTES "Practice modes"); try them and tune. Vocab rows in the same list with several translations are accepted in any of them.
9. **Phase 10 default lists.** Curated library that users can add to their own sets.

## Open questions

- Correctness strategy for generated questions (NOTES.md open question). Blocks Phase 9.
- Default Greek accent policy per level (NOTES.md open question).
- Alt+H opens the History menu in Firefox on Windows. Keep it, or pick another key for the hint shortcut?
- Should a test count towards the "onder de knie" mastery rule (`streak >= 2`)? Right now test answers update `row_progress` like learn answers do.

## Notes

- Docs and code stay in English; all user-facing text stays in Dutch (RULES.md).
- Do not touch configs (`svelte.config`, adapter, etc.), per RULES.md.
- Stray line `- [x] Search modal verbeterd (claude1)` in TODO.md under Phase 2 is left as is; it does not match the phase format.
- 2026-10-22: added Quizlet/StudyGo import, `/sets` organising, "Aanpassen met AI" in the editor, "Uitleg bij je fouten" (row `tip`), and challenges (`/uitdagingen`, needs `005_challenges.sql`). See NOTES "Sets ordenen, import, AI-aanpassen, uitleg, uitdagingen". None of it has been seen in a real browser or against real Gemini/Supabase yet.
- 2026-10-22 (evening): AI auto mode (prompt -> set), one Importeren menu on `/sets`, `/sets` search/group/sort, set page with full-width long lists, "Termen kiezen" (practise only picked terms) and grouping by mastery; Gemini/limit copy removed. See NOTES "AI auto mode, import menu, selection practice". Try: auto mode with real prompts (check the content it makes for Latin/Greek), selection practice in each mode, the import dialogs on a phone.
