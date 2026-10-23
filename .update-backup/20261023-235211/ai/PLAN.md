# PLAN.md — Uiltje (study app, mascot: a small owl)

Study web app for memorizing structured lists (Latin/Greek declensions, conjugations, vocab), later stylistic devices, grammar and translation rules. Users build their own sets; AI (Gemini) can later create sets from photos/text.

Language: UI in Dutch. Code, comments, docs in English.

## 1. Stack
- SvelteKit (Svelte 5, runes) + TypeScript (strict) + Tailwind CSS 4 (configured in `src/routes/layout.css`, no app.css)
- Supabase: Auth (Google, email, GitHub) + Postgres. TEXT ONLY, never use Storage buckets, never store user files.
- Hosting: Vercel (`@sveltejs/adapter-vercel`), `@supabase/ssr` for auth in hooks
- Validation: zod (also used to generate JSON Schema for Gemini later)
- Package manager: npm. No Vitest/Playwright. Checks: `npm run check` + lint.
- v1 has no own backend beyond SvelteKit routes. Gemini calls (later) go through a server route so the API key never reaches the browser.

## 2. Folder structure
```
src/
  hooks.server.ts            supabase client + session
  routes/
    layout.css               tailwind import, @theme tokens, base styles
    +layout.svelte           app shell (sidebar on desktop, bottom nav on mobile)
    +layout.server.ts        session/user
    +page.svelte             dashboard
    login/                   login page
    auth/callback/+server.ts OAuth callback
    vak/[subject]/           sets of one subject (latin, greek, ...)
    sets/new/ | sets/[id]/ | sets/[id]/edit/ | sets/[id]/practice/
    s/[token]/               shared-set landing (import copy)
    friends/ | leaderboard/ | stats/ | settings/
  lib/
    components/ui/           Button, Card, Input, Modal, Toast, ProgressBar...
    components/practice/     AnswerGrid, HintBar, StageIndicator, ResultScreen
    components/editor/       ListEditor, RowTable, SetMeta
    engine/                  pure TS: stages.ts, checker.ts, session.ts, hints.ts
    schema/                  types.ts, zod.ts, migrate.ts
    storage/                 adapter.ts, local.ts (guest), supabase.ts
    state/                   *.svelte.ts (runes-based stores)
    audio/                   sfx.ts (WebAudio / small static mp3)
    server/                  supabase.ts, (later) gemini.ts, ocr.ts
    utils/
static/sfx/                  small sound effects (static assets only)
```

## 3. Data model (JSON, source of truth for sets)
A **Set** is a collection of **Lists** (rijtjes). Lists can have a `group` (e.g. "Groep 1", "Groep 2a").

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid",
  "title": "Latijn: declinaties",
  "subject": "latin",            // latin | greek | free string
  "level": "vwo",                // vmbo-* | havo | vwo | gym (affects generated questions only)
  "folder": null,                // optional grouping label inside a subject
  "settings": { "strictAccents": true, "strictMacrons": false, "caseSensitive": false },
  "lists": [
    {
      "id": "uuid",
      "template": "table",       // v1 template; later: "vocab", "device", "grammar-rule"
      "kind": "declension",      // declension | conjugation | vocab | custom
      "title": "mensa",
      "group": "Groep 1",
      "columns": { "prompt": "Vorm", "answer": "Woord" },
      "dimensions": ["number", "case"],   // order = default stage progression
      "rows": [
        { "id": "uuid", "prompt": "ev nom", "answers": ["mensa"], "tags": { "number": "sg", "case": "nom" } },
        { "id": "uuid", "prompt": "mv gen", "answers": ["mensarum"], "tags": { "number": "pl", "case": "gen" } }
      ]
    }
  ]
}
```
Rules:
- `answers` is an array: every entry is an accepted variant.
- `tags` drive progressive learning (stages) and filtering. Dimensions are free strings, so conjugations use e.g. `tense`, `person`, `number`, `mood`, `voice`.
- Unknown template/kind must degrade to `table`/`custom`, never crash.
- `schemaVersion` + `migrate.ts` for future changes. Gemini and the editor must output exactly this schema (validated with zod, always previewed by the user).

## 4. Supabase schema (text only)
- `profiles(id uuid pk = auth.users.id, display_name, avatar_color, created_at)`
- `sets(id uuid pk, owner_id, title, subject, level, folder, data jsonb, share_token text unique null, forked_from uuid null, created_at, updated_at)`
- `friendships(requester_id, addressee_id, status 'pending'|'accepted', created_at)` (friend by invite code/link)
- `row_progress(user_id, set_id, list_id, row_id, correct int, wrong int, streak int, last_seen, primary key(user_id,set_id,list_id,row_id))`
- `practice_sessions(id, user_id, set_id, mode 'learn'|'test', started_at, ended_at, total int, correct int)`
- View/RPC for leaderboards: per friend group, per week: sessions, rows practiced, accuracy.
- RLS: owner can CRUD own sets; anyone with a valid `share_token` can read via RPC; progress/sessions only own rows; leaderboard only exposes aggregates of accepted friends.
- Sharing = link; opening it creates an independent editable copy (`forked_from`), no live co-editing.

## 5. Guest mode
- `StorageAdapter` interface (`listSets, getSet, saveSet, deleteSet, getProgress, saveProgress`) with `local.ts` (localStorage/IndexedDB) and `supabase.ts`.
- Guest: create sets, practice, local stats. No sharing, no leaderboards.
- On login: offer to import local sets/progress into the account.

## 6. Practice engine (`lib/engine`, pure TS, no UI imports)
Input: one or more lists (multiple lists/sets can be combined, e.g. all declensions at once), settings, mode.

**Stages** are generated from `dimensions`/tags. Default ladder for e.g. number × case:
1. sg only → 2. pl only → 3. sg + pl → 4. next subset (other sg / pl / both) … → N. everything combined (shuffled).
Stage ladder is overridable per list/user later ("settable").

**Flow per stage:** ask rows in a pool; a row counts as mastered for this stage when answered correctly (no hint) with its streak target reached. Stage completes when all its rows are mastered, then promote.

**Mistakes:** unlimited attempts. Wrong row is re-queued after 2–3 other rows. Hint ladder: (1) first letter, (2) length/pattern mask like `m _ _ _ a`, (3) reveal answer (counts as wrong). If wrong count in a stage exceeds a threshold, step back one stage (`stepBack: 'none' | 'row' | 'stage'`, default `stage`).

**Modes:**
- Learn: immediate feedback, hints, retries, stages.
- Test: no feedback until the end, one input per row (or whole grid), result screen with score and wrong answers.

**Input UX (laptop first):** whole-table grid fill-in with Tab/Enter navigation, fully keyboard-driven, single-row prompt mode as alternative. Large touch-friendly inputs on mobile.

**Statistics:** per-row accuracy, hardest rows, sessions count, daily streak, history chart. All counts and percentages are over **onderdelen** (rows), so they work for any template (rijtjes, stijlfiguren, regels). A row is "onder de knie" (mastered) when `row_progress.streak >= 2` (two unaided correct answers in a row); a list/set when all its rows are. Terminology in DESIGN.md §7.
**Scheduling:** none forced. User decides when to practice. (Spaced repetition suggestions can come later.)

## 7. Answer checking (`checker.ts`)
- Normalize: Unicode NFC, trim, collapse whitespace, always case-insensitive.
- Accents strict by default (setting): compare including diacritics. When off: strip combining marks.
- Latin macrons: ignored by default (strip U+0304 only), setting to be strict.
- Greek: normalize final sigma (ς/σ), polytonic accents compared strictly by default, setting to relax.
- Accept any entry from `answers`; user may also type `a/b` for variants when a row has several.
- No typo tolerance in v1.
- Later: optional keybind-to-Greek input (t→τ, o→ο, w→ω) as setting; v1 uses OS keyboard.

## 8. Design system ("cozy")
- Inspiration: warm paper-like palette (cream, tan, terracotta, sage green, deep plum/brown text), light + dark theme via `data-theme`, soft shadows, big radii.
- Fonts: Fredoka (headings, buttons), Nunito (body). Self-host via `@fontsource`.
- Components: chunky buttons with a visible bottom "3D edge" that presses down on click, rounded cards, subtle leaf/sparkle decorations, small plant/lamp illustration accents (SVG), progress bars with soft fill.
- Dashboard: greeting, "continue where you left off" card, subjects grid with progress, streak card, recent sets, quick actions. (No timer/calendar/tasks.)
- Sound: satisfying short sfx on correct/wrong/stage-up (WebAudio or tiny static files), mute setting. Light confetti only on passing a test or finishing a stage. Calm, never noisy.
- Layout: sidebar on desktop (uses width: grid + side panel for hints/stats), bottom nav on mobile. Respect `prefers-reduced-motion`.
- All tokens live in `@theme` inside `src/routes/layout.css`.

## 9. Later features
- **AI import:** photo → OCR (client or server) → text → Gemini picks template, outputs schema JSON → preview/edit screen → save. Free Gemini models: on error/overload retry, then fall back through an allowed-model list. Key only on server.
- **Generated questions** (stijlfiguren, grammar): generated ahead of time at set creation or in the background, stored in the set as text, never generated while the user waits. Correctness strategy TBD (see NOTES.md): verified question bank + schema-constrained output + human approval step.
- **Levels:** `level` steers difficulty/phrasing of generated questions only.
- **Default lists:** curated library users can add to their own sets.
- Other exercise modes (flashcards, multiple choice, listening), cozy music, keybind-to-Greek input, word/translation practice.

## 10. Phases
0. Setup: `npx sv create` project, Tailwind 4, adapter-vercel, Supabase client, env, base layout.css
1. Schema + zod + engine (checker, stages, session) as pure TS
2. Design system + app shell + dashboard (static data)
3. Set/list editor (manual, JSON in guest storage)
4. Practice UI (learn + test mode, hints, results)
5. Auth + Supabase persistence + guest-to-account import
6. Stats, sharing by link, friends, leaderboards
7. Polish: sfx, confetti, mobile pass, dark mode, a11y
8. AI import (OCR + Gemini)
9. Generated questions (devices, grammar)
10. Default lists library
MVP = phases 0–5 (rijtjes + UI).