# TODO.md

Details live in PLAN.md (section numbers in brackets). Mark `[x]` when done and log surprises in NOTES.md.

## Phase 0 — Setup (PLAN §1, §2)
- [x] `npx sv create` (TypeScript, Tailwind, adapter-vercel), put PLAN/TODO/NOTES/RULES in ai folder
- [x] Move Tailwind import to `src/routes/layout.css`, verify it loads in `+layout.svelte`
- [x] Install: `@supabase/supabase-js @supabase/ssr zod @fontsource-variable/fredoka @fontsource-variable/nunito`
- [x] `.env` with `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`; `hooks.server.ts`
- [x] Create Supabase project, enable Google (+ email, GitHub) providers

## Phase 1 — Schema + engine (PLAN §3, §6, §7)
- [x] `lib/schema/types.ts` + zod schema + `migrate.ts`
- [x] `engine/checker.ts` (normalize, accents/macrons/sigma, variants)
- [x] `engine/stages.ts` (build stage ladder from tags, combine lists)
- [x] `engine/session.ts` (queue, hints, requeue, step back, learn/test)
- [x] Sample Latin set (mensa, 1st–5th declension, perfectum) as seed JSON

## Phase 2 — Design system + shell (PLAN §8)
- [x] `@theme` tokens (colors light/dark, radii, shadows, fonts) in layout.css
- [x] UI components: Button (chunky), Card, Input, ProgressBar, Modal, Toast
- [x] App shell: sidebar (desktop) + bottom nav (mobile)
- [x] Dashboard with static data

- [x] Search modal verbeterd (claude1)
## Phase 3 — Editor (PLAN §3)
- [x] Set create/edit page, list editor with row table, tags/dimensions UI
- [x] Groups, folder, subject, level, settings
- [x] Import/export JSON (validate with zod)
- [x] Guest storage adapter (`storage/local.ts`)

- [x] Woorden: sjabloon "Woordenlijst" (woord → vertaling, kind 'vocab')
- [ ] Grammatica & stijl: sjablonen voor stijlfiguren, participium, coniunctivus enz.; AI-gestuurd, blijft "Binnenkort" tot fase 9 (fase 8 is er nu)
- [x] Naam van de derde categorie ("Grammatica & stijl") definitief maken (blijft zo)
- [x] Dimensies herordenen in de editor
## Phase 4 — Practice UI (PLAN §6)
- [x] Select lists to combine (multi-select across sets)
- [x] Learn mode: grid input, keyboard nav, hints, stage indicator
- [x] Test mode + result screen
- [x] Settings: strictness, step-back behavior
- [x] Blok-oefenen (5-10 vormen per scherm), leren + toets, richting vorm↔bepaling, resultaatscherm
- [x] Combineren van rijtjes uit meerdere sets (`/vak/[subject]/practice`)
- [x] "Alleen fouten oefenen" op het resultaatscherm
- [x] Zijpaneel op laptop, geluid en confetti bij geslaagd
- [x] Stap terug bij veel fouten en instelbare strengheid in de oefeninstellingen
- [x] Toetssysteem: één keer per vorm, tijdslimiet, cijfer (geslaagd vanaf 55%), vast aantal vormen, herkansing van fouten, resultaten lokaal opgeslagen
- [x] `/vakken`, `/vak/[subject]` en `/settings` (niveau, oefenstandaarden, cijfer, geluid, thema)
- [x] Setpagina `/sets/[id]` met Oefenen-dropdown (Leren/Toets live, rest binnenkort)
- [x] Woordjes-modus: rondes van 5 (intro, meerkeuze, typen, herhalen), eigen toets
- [x] Klikgeluid op elke knop (`audio/clicks.ts`)
- [x] Editor opgeruimd (menu's, tags verborgen)
- [x] Lucide-icoontjes, menu's in de top layer (Popover API), stabiele layout (vaste breedte, gereserveerde ruimte), tactiele geluiden
- [x] Set-editor opnieuw: opslaan gaat naar de setpagina, lijstenmenu links, brede layout zonder max-width
- [x] Opruiming: `engine/session.ts` weg, `StepBack` en `toProgressDeltas` in `engine/deltas.ts`
- [x] Oefenstartscherm opnieuw: lijstkeuze links, Hoe/Richting/Start rechts, extra opties ingeklapt
- [x] Meerkeuze, Flashcards, Dictee, Spelling, Hints als aparte modi (`engine/cards.ts`, `CardStart`, `CardRunner`)

## Phase 5 — Auth + persistence (PLAN §4, §5)
- [x] Login page + OAuth callback, session in layout
- [x] SQL migrations: tables, RLS, indexes (`ai/sql/001_persistence.sql`, run once in the Supabase SQL editor)
- [x] `storage/supabase.ts`, adapter switch by session (`getStorage()` forwards to local or Supabase)
- [x] Guest → account import (dialog after login + card on `/settings`), uitloggen op `/settings`
- [x] Login page redesigned (mint game world, owl on books, bubble title, Segmented inloggen/registreren, wachtwoord tonen), visible "Inloggen" button for guests (sidebar, mobile top bar), owl favicon
- [ ] Run the migration on the real project and try login, save, practice, import (not testable from the scratch project)

## Phase 6 — Stats, sharing, friends (PLAN §4)
- [x] Progress saving per row, stats page (`/stats`), streak, session log, dashboard and command palette on real data
- [x] Share link + copy-on-open (`s/[token]`), send a set to a friend (`/gedeeld/[id]`), share dialog on the set page
- [x] Friends: search by username, requests, invite link (`/i/[code]`), `/friends`
- [x] Leaderboard (`/leaderboard`, week/month, most practised / accuracy, opt-out) and dashboard card on real data
- [x] Profile page (`/profile`): photo upload (Storage bucket `avatars`), name, username, leaderboard privacy
- [ ] Run `ai/sql/002_social.sql` in Supabase and try it with two real accounts

## Meldingen (notification centre)
- [x] Bell with unread badge + panel (`shell/NotificationBell.svelte`): sidebar (rail and lg), top bar on phones; closing marks as read, "Alles gelezen"
- [x] Live: friend requests and sets sent to you; local: one welcome on the first visit, accepted friend request, streak and answer milestones (no tips, motivation or reminders)
- [x] Toast when something new arrives (`state/notifications.svelte.ts`)
- [ ] Bell on every phone page (now only on the dashboard top bar; the bottom bar has no room)
- [ ] Push/e-mail notifications (needs a server job), notification when a friend overtakes you on the leaderboard

## Phase 7 — Polish (PLAN §8)
- [x] Sfx + mute, confetti (gedaan bij fase 4)
- [x] Mobile pass: top bar buttons above the greeting, phone type scale (text-xs/sm grow), 42px touch targets, 16px inputs, theme-color meta
- [x] Themes: Crème, Salie, Lavendel, Zeemist (light), Cacao (improved dark), Middernacht, Bos (dark); picker in Instellingen > Uiterlijk; toggle goes to your last light/dark pick
- [x] Settings: two column stacks, no gap under short cards
- [x] Animations: page transitions, staggered rise, springy buttons/switches/segmented pill, modal/sheet/menu in and out, toast, bell ring, count-up, bars and rings that grow
- [ ] Reduced-motion and a11y pass over every screen in the real browser (CSS kills all motion, view transitions skipped; not yet tried on a real phone)

## Phase 8 — AI import (PLAN §9)
- [x] OCR step (Gemini vision, same call as structuring), server route `/api/ai/import`, Gemini with retry + model fallback (`lib/server/ai/`)
- [x] Preview/edit screen (always): `/sets/ai`, reuses `ListEditor`, nothing saved until Opslaan; "Open in de volledige editor" hands over as concept
- [x] Entry points: "Met AI" on `/sets`, link in the empty editor
- [ ] Set `GEMINI_API_KEY` (+ `GEMINI_MODELS`) in `.env` and on Vercel, then try it with real photos (Latin table, Greek table, vocab list) and fix what the real model does
- [ ] Phone check: camera input, thumbnails, review screen on 390px

## Phase 9 — Stijlfiguren & grammatica (PLAN §9)
- [x] Verified grammar catalogues from the CvTE syllabi 2027 (`lib/grammar/`): Latin 84 items + 120 stamtijden, Greek 107 items (incl. Ionisch of Herodotus, Homerus, tragedie)
- [x] Correctness strategy agreed: owner approves every generated question at first, others maybe later
- [x] Schema v4: list kind `concept` (explanation or example -> term) and optional row `ref`; migration 3 -> 4; practice uses the existing word engine (multiple choice AND typed, no new runner)
- [x] "Stijlfiguren" and "Grammatica" templates: `CataloguePicker` (tick items from the syllabus, or add your own with explanation), rows built from the syllabus text (no AI)
- [x] Suggestions: "Stel een regel voor" (`SuggestionModal`), `/suggesties` (own suggestions; owner accepts/rejects), accepted ones appear for everyone in the picker. SQL: `ai/sql/004_grammar_suggestions.sql`
- [x] Fix: practice wording for begrippen ("Welke term hoort hierbij?" instead of "Vertaal", "begrippen" instead of "woorden") and the answer that ran out of its row on the "Nieuwe woorden" intro
- [x] Question bank: AI writes sentences ("welke stijlfiguur zie je?") and descriptions ("welke term past bij deze uitleg?") around syllabus items, a second AI pass checks them, the owner approves (`/vragen`, `ai/sql/006_grammar_questions.sql`, `/api/ai/questions`); answers are always the catalogue term
- [x] Approved AI questions are offered in the picker ("Ook extra vragen van de AI") and included in library sets
- [x] "Uitleggen" practice mode for begrippen: explain a term in your own words, see the syllabus text, rate yourself, AI checks all answers at the end (`/api/ai/explain`, one request per run); does not count for progress
- [x] Owner can edit a suggestion before accepting it (SQL 006 `update_grammar_suggestion`)
- [x] Phase 10 (first version): `/bibliotheek` with ready-made sets built from the catalogues (Stijlfiguren & retorica, Grammatica for Latijn and Grieks, Stamtijden Latijn), added to Mijn sets with one click
- [ ] Run SQL 004 and 006 in Supabase, make yourself owner (`insert into public.app_admins ...`), then try: generate questions on /vragen (start with 3 items), approve, add a library set, practise it, "Uitleggen", send and accept a suggestion
- [ ] Phone check: picker modal, /vragen (two columns), concept row editor, Uitleggen
- [ ] Greek stamtijden / form lists (aorist, perfect, future): the syllabus lists forms without lemmas, so they need a lemma per form added by hand and checked
- [ ] Explanations shown after answering in the practice screens (the `explanation` of an approved question is stored but not shown yet)
- [ ] Library: more sets (per author, per chapter) and a way for the owner to publish own sets

## Phase 10 — Default lists
- [ ] Curated library, add-to-my-sets

## Loading states
- [x] Skeleton loading on every page (`ui/Skeleton.svelte`, `lib/components/skeleton/`), rule added to RULES.md

## Social update (profiles)
- [x] Profile editing moved to `/settings` (tab Profiel), settings split into tabs Profiel / Voorkeuren / Account
- [x] Delete account (Account tab, `delete_my_account()`)
- [x] Public/private sets (`sets.is_public`), choice in the set editor
- [x] Profile page with statistics and sets, own (`/profile`) and friends' (`/u/[username]`); copy a friend's public set (`/openbaar/[id]`)
- [x] Bell next to the theme toggle; fixed the notifications effect loop in `+layout.svelte`
- [ ] Run `ai/sql/003_profiles.sql` and try it with two accounts (public/private, friend profile, stats switch, delete account)
- [ ] Visibility chip on `/sets` cards and in the set page menu
- [x] Top bar (search, meldingen, thema, profiel) on every page via `AppShell`

## Greek keyboard
- [x] Per-set keyboard setting (schema v3), `toGreek`, `greekKeyboard` action, editor + practice inputs
- [ ] Try it in the browser (editor, learn, test, cards); decide if pasted text / reverse vocab direction need another rule

## Sets ordenen, import, AI-aanpassen, uitleg, uitdagingen (2026-10-22)
- [x] Quizlet/StudyGo import (`CardImportModal`, `editor/cards.ts`): paste or .txt/.csv, auto-detected separators, new vocab set
- [x] `/sets` organising: folder filter, grouped by folder, "Ordenen" mode with bulk move to folder and bulk delete
- [x] "Aanpassen met AI" in the editor (⋮ menu and list nav): instruction -> proposals -> tick what to apply -> "Ongedaan maken"
- [x] Optional row field `tip` (schema, editor input with the bulb button, set page); "Uitleg bij je fouten" on the result screen (AI proposals, saved on confirm)
- [x] Challenges: `ai/sql/005_challenges.sql`, "Vriend uitdagen…" on the set page, `/uitdagingen`, `/uitdaging/[id]`, bell notification
- [ ] Run `ai/sql/005_challenges.sql` in the Supabase SQL editor
- [ ] Try in the real app: Quizlet export, bulk move/delete, AI edit on a real set, tips after a test, a challenge between two accounts
- [ ] Show the tip right after a wrong answer inside the runners (now only on the result screen, set page and editor)

## AI automodus, import-menu, set page (2026-10-22, evening)
- [x] AI auto mode on `/sets/ai` ("Beschrijven", the default source): a short prompt makes a set, same review screen, optional "add to existing set"
- [x] All user-facing text about Gemini, the free quota and "AI-import" removed (login gate, review note, privacy line, edit modal, error messages)
- [x] PDF and "existing lists" were sent by the browser but ignored by the server: now passed on to the model
- [x] `/sets`: one "Importeren" menu (Quizlet/StudyGo, photo/document with AI, JSON), each text import opens a dialog on the same page (no navigation, which caused the colour flash); dashboard and palette links open it via `/sets?import=cards|json`
- [x] `/sets` organising: search, group by folder or subject, sort (recent/name), per-card ⋮ menu (edit, to folder, delete), select all in a group
- [x] `/sets/[id]`: lists with long text (concept lists, long definitions) take the full width, short lists stay in two columns; concept lists show term first
- [x] `/sets/[id]`: "Termen kiezen" to tick single terms and practise only those (all practice modes, via `?selection=1`)
- [x] `/sets/[id]`: group by "Op beheersing" (Lastig, Bezig, Nog niet geoefend, Onder de knie) with "Oefen deze" per group
- [ ] Try in the real app: auto mode with a few prompts (stijlfiguren, declension, vocab), import menu on phone, selection practice in learn/test/flashcards, grouping with real progress
- [ ] Remember the chosen grouping and the pick across visits (now: per visit, selection per tab)
- [x] Uitleggen: no self-rating, AI check with the set's strictness, "Ik ben het er niet mee eens" (SQL 007)
- [x] `/review` for the owner: Vragenbank + Voorstellen + Bezwaren in one page
- [ ] Run `ai/sql/007_explain_disputes.sql`, then try: Uitleggen as strict and relaxed, send a dispute, resolve it on /review
- [x] Tell a learner when their dispute was handled (bell notification, SQL 008)
- [x] Explanation after a wrong answer in the runners (`RowNote`: row tip + official explanation via `ref`); not in BlockBoard (rijtjes) or test mode
- [x] Approved AI-question explanations become the row `tip` (SQL 008 returns `explanation`)
- [x] Visibility: "Openbaar" chip on `/sets` cards and the set page, toggle in the ⋮ menus (accounts only)
- [x] Uitleggen on kant-en-klare sets: "Oefenen" menu (with Uitleggen for concept lists) on the library cards after adding
- [ ] Run `ai/sql/008_notes_and_replies.sql`, then try: wrong answer shows the note, dispute reply in the bell, visibility toggle, Uitleggen from /bibliotheek
- [ ] Sets added from the library before this update do not have the new tips (add them again or edit)

## Uitleggen: nakijken per begrip (2026-10-24)
- [x] Uitleggen: the AI checks every answer right after "Laat zien" (goed / bijna / niet), not at the end
- [x] "Bijna": the learner decides ("Ik had het goed" / "Nog niet goed")
- [x] "Bezwaar" (small button on a "niet"): optional note, sent to the owner (SQL 007), the answer counts as goed at once
- [x] A begrip that ends "niet" comes back later in the run (after 3 other begrippen), max 3 attempts per begrip
- [ ] Try in the real app: a run with wrong answers (they come back), a "bijna" choice, an objection (check /review > Bezwaren), a failed check (offline) and "Opnieuw nakijken"

## Uitdagingen: alleen de hele set telt (2026-10-24)
- [x] A challenge only counts a test of the WHOLE set: every row of its kind, no question limit, no picked terms ("Oefen selectie"), no list left out
- [x] Sets with rijtjes AND woorden/begrippen: one whole-set test of each kind; the score is the total of the best test per kind
- [x] /uitdagingen explains why a score is missing (partial test, other kind still missing); copy on the invite page and in the challenge dialog
- [ ] Run `ai/sql/009_challenge_whole_set.sql` in the Supabase SQL editor
- [ ] Try with two accounts: a test of 10 forms does not count, a test of all forms does, a set with rijtjes + woorden needs both
- [ ] Tests taken before this update have no whole-set mark and do not count: take the test again

## Minigames (2026-10-24)
- [x] "Minigames" entry in the Oefenen menu (`PracticeMenu`) -> `/sets/[id]/minigames` (hub with game cards; `?selection=1` is passed on)
- [x] Uilenvangst (`/sets/[id]/minigames/uilenvangst`): start screen, game, result (stars, lastige uilen, retry); progress and session log like the other modes
- [x] Engine `engine/catch.ts` (pure, tested with 25 scenario checks) + new SVGs (canopy/trunk, meadow with bushes, basket, nest, butterfly, stars, card art)
- [x] Three more games shown as "Binnenkort": Uilen-memory, Nachtvlucht, Nestbouwer
- [ ] Try in the real app: light/dark, phone (3 lanes), keyboard (1-4, arrows, space, P), pause, reduced motion, a rijtje, a begrippen list, selection practice
- [ ] Build the next game (see NEXT.md)

## Groepen op de vakpagina (2026-10-24)
- [x] `components/sets/SetOverview.svelte`: search, group by folder, sort, folder filter, Ordenen (move to folder / delete), card menus; used by `/sets` and `/vak/[subject]`
- [x] `/vak/[subject]` now has all of it, limited to that subject (so in Latijn you can make folders such as "Hoofdstuk 3" via Ordenen > Naar map… > Nieuwe map…); "Op vak" grouping is hidden there
- [ ] Try: `/sets` still behaves as before (refactor not run in a browser), and `/vak/latijn`: make a folder, move sets, filter, delete
- [ ] Idea: practise one folder only ("Oefen deze map"); needs a folder filter on `/vak/[subject]/practice`
