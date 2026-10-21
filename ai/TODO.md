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
- [ ] Grammatica & stijl: sjablonen voor stijlfiguren, participium, coniunctivus enz.; AI-gestuurd, blijft "Binnenkort" tot fase 8-9
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
- [ ] OCR step, server route, Gemini with model fallback + retry
- [ ] Preview/edit screen (always)

## Phase 9 — Generated questions (PLAN §9)
- [ ] Decide correctness strategy (NOTES.md open question)
- [ ] Stijlfiguren + grammar question templates, background generation

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
