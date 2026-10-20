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
- [ ] Meerkeuze, Flashcards, Dictee, Spelling, Hints als aparte modi

## Phase 5 — Auth + persistence (PLAN §4, §5)
- [x] Login page + OAuth callback, session in layout
- [ ] SQL migrations: tables, RLS, indexes
- [ ] `storage/supabase.ts`, adapter switch by session
- [ ] Guest → account import

## Phase 6 — Stats, sharing, friends (PLAN §4)
- [ ] Progress saving per row, stats page, streak
- [ ] Share link + copy-on-open (`s/[token]`)
- [ ] Friends by invite link, leaderboard (practice count, accuracy)

## Phase 7 — Polish (PLAN §8)
- [x] Sfx + mute, confetti (gedaan bij fase 4)
- [ ] Reduced-motion, dark mode, mobile pass, a11y over de hele app (nieuwe oefenschermen zijn wel in licht en donker, 1280px en 390px bekeken)

## Phase 8 — AI import (PLAN §9)
- [ ] OCR step, server route, Gemini with model fallback + retry
- [ ] Preview/edit screen (always)

## Phase 9 — Generated questions (PLAN §9)
- [ ] Decide correctness strategy (NOTES.md open question)
- [ ] Stijlfiguren + grammar question templates, background generation

## Phase 10 — Default lists
- [ ] Curated library, add-to-my-sets
