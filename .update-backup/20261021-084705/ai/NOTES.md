# NOTES.md

Read this before starting work. Add errors, gotchas and decisions here so they are not rediscovered (saves tokens). Keep entries short, newest first inside each section.

## Decisions (from planning)
- App name: **Uiltje** (mascot: owl, Athena/Minerva nod).
- Set = collection of lists (rijtjes); lists have optional `group`. Rows have `answers[]` (variants) and `tags` (drive stages).
- Lists/sets can be combined in one practice session.
- Sharing: link → independent editable copy. Friends leaderboards (practice count, accuracy).
- Guest: localStorage only, no sharing/leaderboards; import on login.
- Text only in Supabase, never files.
- Accents strict by default; macrons ignored by default; always case-insensitive.
- Fonts Fredoka + Nunito; palette warm cream/terracotta/sage; light + dark.
- Infinite attempts; learn mode vs test mode; no forced scheduling.
- MVP = rijtjes + UI (PLAN phases 0–5). AI later.
- Gemini: free models, retry then fallback list, server route only.

## Phase 1 decisions (schema + engine)
- Types: `StudySet/StudyList/StudyRow` (not `Set`, clashes with global). `types.ts` is hand-written; `zod.ts` asserts at compile time that the schema matches it.
- `zod.ts` is strict and has no transforms/defaults, so `z.toJSONSchema(StudySetSchema)` works for Gemini (checked, zod 4). Leniency lives in `migrate.ts` `parseStudySet()`: missing schemaVersion = current, unknown template -> `table`, unknown kind -> `custom`, missing settings/folder/group/columns/dimensions/tags filled with defaults, `answers: "x"` -> `["x"]`. Add a `migrations[v]` entry whenever SCHEMA_VERSION is bumped.
- `level` is required (enum). Free-subject sets must still pick one. Say if it should become optional.
- Rows are keyed `${setId}/${listId}/${rowId}` (`PracticeRow.key`); each row carries its own set's settings, so sets with different strictness can be combined.
- Checker: `caseSensitive` setting honored (default false); final sigma always normalized; strictAccents off strips all marks; macrons stripped unless strictMacrons. `a/b` input: every part must match a different accepted answer; a single variant alone is also accepted.
- Stage ladder: first dimension with 2+ distinct values -> one stage per value, then `all` (so number x case = sg, pl, all). `buildLadder(rows, {depth})`: depth 2 also adds finer stages (e.g. per case) before their parent. Combined lists merge stages with equal id (`number=sg`). Lists without a splitting dimension only appear in `all`. PLAN §6 left "next subset" open; depth 1 is the default, easy to change.
- Only the `all` stage is shuffled; earlier stages follow table order. Streak/mastery restart in every stage.
- Learn flow: wrong -> requeued after 2-3 other rows (not stuck on the row); hints persist until the row is resolved; correct after a hint = `assisted` (no mastery, neutral in stats); reveal (3rd hint) = wrong. Hints use `answers[0]`.
- Step back: `stage` (default) steps back one stage when wrongs in the stage > max(4, 75% of stage rows) (stage 0: counter just resets); `row` adds one extra required correct for a row after >2 wrongs in the stage; `none` off. `stepBackAfter` overrides the number. Defaults are guesses, tune them in play.
- Row stats per session: `correct` (unaided), `wrong` (incl. reveal), `assisted`, trailing `streak`. `progressDeltas()` gives rows for row_progress; merging streak with stored progress is the storage layer's job.
- Test mode: `TestSession` single pass, no stages/hints, unanswered = wrong, locked after `finish()`.
- Seed: `lib/seed/latin.ts` exports `buildLatinSeed(nextId)` (fresh ids per import) and `latinSeed` (sequential UUID-shaped ids). No macrons or vocative in the seed on purpose. `manus` dat sg accepts `manui` and `manu`.
- Engine uses `Intl.Segmenter` (graphemes) for hints; needs lib ES2022 (SvelteKit default is fine).

## Phase 2 decisions (design system + shell + dashboard)
- Import alias is `#lib/...` (package.json `imports`), NOT `$lib`. Imports of `.ts` files through it need the `.js` extension (`#lib/utils/user.js`); `.svelte` files use their real extension. Inside `src/lib` files import each other relatively.
- Tokens live in `layout.css` (`@theme` = light, dark overrides under `:root[data-theme='dark']` and `@media (prefers-color-scheme: dark) :root:not([data-theme='light'])`; the two dark blocks must be kept identical). Tailwind utilities come from token names: `bg-surface`, `text-text-muted`, `border-border`, `rounded-card`, `shadow-card`, `font-heading`, `ease-cozy`.
- Deviations from DESIGN.md hex values, for WCAG 4.5:1 (measured): `--color-text-muted` #8A7568 -> #765F52; filled primary buttons use `--color-primary-btn` #AD613A (edge #8A4A2D) instead of #C97B55 because cream text on #C97B55 is only 3.2:1 (`--color-primary` itself is unchanged and still used for bars, bar highlights, focus ring). New tokens: `--color-primary-text` (active nav/links on primary-soft), `--color-on-primary`, `--color-on-accent`, `--color-cream(-edge)`, `--color-rose-edge`, mascot colors `--color-owl/-dark/belly/beak/pupil/glint`, `--glow-opacity`.
- `.btn` (data-variant/size/icon) and `.input` (data-state) are global classes in `layout.css`; everything else is Tailwind utilities in the components. Scoped `<style>` only where needed (Owl, Deco, Sidebar active bar).
- Right rail on the dashboard appears from 1280px (`xl`), not 1024px: at 1024 the sidebar (248px) leaves too little room for two columns. Below that the rail drops under the main content (2-up on tablet).
- Settings icon is a "sliders" icon (simpler than a gear). Icons are hand-written 24px stroke paths in `ui/Icon.svelte` (`IconName` union).
- Theme: `state/theme.svelte.ts` keeps the choice in localStorage (`uiltje-theme`), an inline script in `app.html` applies it before paint; toggle button in the top bar. `app.html` `lang` is now `nl`.
- Shell: `AppShell` renders no chrome on `/login` and `*/practice`. Nav links point to pages that do not exist yet (`/vakken`, `/sets`, `/friends`, `/stats`, `/settings`, `/vak/[subject]`), they 404 until those phases.
- Dashboard data is static in `lib/dashboard/sample.ts`; greeting is set in `onMount` (browser clock) to avoid SSR mismatch. Search field in the top bar is not wired up yet (Ctrl/Cmd+K focuses it).
- Dark hero scene is the same illustration with a stronger lamp glow, not the sunset-cabin scene from DESIGN.md. Sparkles/sprig/owl poses are done; bushes/butterflies (mint screens) wait for login/results.
- Not built yet from DESIGN §3/§10: Toggle, StageDots, practice components (phase 4); sounds (phase 7). Toast has no trigger yet: use `toasts.show('...')` from `state/toast.svelte.ts`.
- Svelte 5 gotcha: `$props.id()` must be a direct `const x = $props.id()` initializer. Tailwind: `block` and `flex` on one element both apply; the later utility in the stylesheet wins (`flex`), so Card only adds `block` for links.
- Verified in a scratch SvelteKit 3 project outside the repo: `svelte-check` 0 errors/warnings, dev server without console errors, screenshots light/dark at 1440, 820 and 390px, theme toggle + persistence + Ctrl+K checked.

## Meldingen
- No SQL change: everything is derived from calls that already exist. `state/notifications.svelte.ts` merges *live* items (open requests via `listFriendships`, sets via `listIncomingShares`; they vanish once handled, ids `fr:<person>:<createdAt>` and `sh:<shareId>`) with *local* items stored per person in localStorage (`uiltje:notif:items|read|tip-counter|tip-day|last-visit|pending-out|announced:<userId|guest>`, max 40 items, 45 days). The state file talks to localStorage directly like `theme.svelte.ts`; components never do.
- Accepted request: the server has no "accepted at", so each poll stores your outgoing pending ids (`pending-out`); a friend who was in that list and is now accepted gives `fa:<id>`. Accepting via invite link or accepting somebody else's request does not notify (correct).
- First visit on a device (`uiltje:notif:welcomed`, per device): welcome + 3 facts, then one fact/motivation per day from `notifications/content.ts` (facts are worded modestly: research gives tendencies). Streak milestones (3, 7, 14, 30, 60, 100) and answer milestones (100 … 10000) fire once, only the highest reached; "Houd je reeks vast" when streak >= 2, nothing practised today and it is after 17:00.
- Refresh: on start (login/logout), every 60 s while the tab is visible, when the tab becomes visible, after each navigation (network throttled to 15 s, sessions to 2 min), and when the panel opens. A failed network call keeps the live items that are shown.
- Toasts: one new item -> its title; several -> "N nieuwe meldingen"; welcome has its own text. Only new live items and accepted requests toast, never tips.
- UI: `NotificationBell` has its own top-layer panel (Popover API, like Dropdown) because `Dropdown` only holds menu rows. Rows with an `href` are links, others plain rows; unread rows stay highlighted while the panel is open and are marked read on close. New Lucide icons `bell`, `sparkles`, `heart`. TopBar: actions moved into one wrapper that sits on its own row under the title on phones (more room for title, bell, theme, Inloggen).
- Verified: svelte compiler (0 warnings), strict `tsc` on the notification files with stubs, 18 scenario checks of the state (welcome, daily tip, live requests/shares, accepted friend, milestones, toasts, network error, per-user keys). Not seen in a browser.

## Login redesign + favicon
- `/login` follows DESIGN §6.8: plain app background (no mint backdrop, no bushes/butterflies: removed on request, so DESIGN §6.8's "mint game world" no longer applies to login), a compact one-screen card (small owl + plain Fredoka "Uiltje" title in a header row, thinking while busy; no pink bubble title, removed on request; weergavenaam/gebruikersnaam stacked), `Segmented` for inloggen/registreren instead of a text link, `Input` components, show/hide password (new Lucide icons `eye`, `eye-off` in `Icon.svelte`), ThemeToggle top right. The auth logic is the social version's (`?next=` redirect, email-confirmation notice); the redesign only touched markup and added `showPassword`/`modes`.
- The reserved `min-h-11` slot under the submit button shows either the error (rose, small oops owl) or the "check je e-mail" notice (`message`, sage, happy owl), so buttons never move.
- GitHub/Google marks are inline SVG (`currentColor`) in the login page: Lucide has no brand icons. Deliberate exception to "icons only via Icon.svelte".
- Guest login button: sidebar bottom (icon-only on the tablet rail, label + hint from lg) replaces the account menu for guests; mobile top bar shows a small "Inloggen" button instead of the avatar (< sm). `/settings` already had one. `ProfileMenu` still offers Inloggen.
- `lib/assets/favicon.svg` is now the owl on a transparent background (hardcoded hex values on purpose: an asset cannot use tokens). `+layout.svelte` already imports it.
- Checked: Svelte compiler (0 errors/warnings) and the favicon render at 256 and 32px. Not seen in a browser and no `npm run check` run: look at `/login` in light/dark at 1280 and 390px.

## Phase 5 decisions (persistence)
- SQL lives in `ai/sql/001_persistence.sql`, idempotent (rerun is safe, also on top of a hand-made `profiles` table). Tables: `profiles` (+ `username`, trigger `handle_new_user` copies sign-up metadata, backfills existing users), `sets` (`data jsonb`, plus `list_count`/`row_count` so the overview needs no JSON), `row_progress` (+ `assisted`), `practice_sessions` (phase 5 stores finished tests, `mode='test'`; learn sessions come in phase 6), `user_settings(user_id, data jsonb)`. RLS: own rows only; `anon` has no table access. `username_available(name)` RPC is what the login page calls (the parameter must stay called `name`). Verified by running the file twice in PGlite (WASM Postgres) with stubbed `auth` schema: RLS, upsert hijack blocked, cascade, trigger.
- `getStorage()` returns one stable object that forwards to the current backend, so `const storage = getStorage()` in components keeps working. The root layout calls `useStorageFor(supabase, userId)` synchronously on init and in a `$effect.pre`, so the first read of a page already hits the right backend. Never call it on the server (module state is shared between requests).
- Supabase reads throw `StorageError` (Dutch message) on network/DB errors instead of returning empty, so a failed load is not mistaken for lost data. Callers that do not catch will log an unhandled rejection: check this when running the app.
- `saveProgress` receives the full progress map of a set; the adapter remembers what the database has (cache per set, filled by `getProgress`/`saveProgress`) and upserts only changed rows. `getProgress` pages through PostgREST's 1000-row limit.
- Ids are now always UUIDs (`newId()` has a `getRandomValues` fallback for http on a phone). Sets and test results with a non-UUID id (very old local data) cannot be stored in Supabase: they stay on the device and are reported as "niet gelukt".
- Guest → account import (`storage/guest-import.ts`): sets already in the account (same id) are skipped; progress of new sets comes along; test results are upserted by id; guest settings are only taken when the account still has the defaults. Local copies are removed only after they are confirmed in the account. The login dialog is shown once per account per device (`uiltje:import-dismissed:<userId>`); `/settings` always offers it while guest data exists.
- `/login` redirects signed-in users to `/`. Logout is a button in the Account card on `/settings` (there was none).
- `utils/user.ts` prefers `user_metadata.display_name` / `username` (set by the email sign-up form and the trigger).
- Account menu (`shell/ProfileMenu.svelte`, a Dropdown): top bar = avatar button with Profiel (soon), Instellingen, Uitloggen; sidebar bottom = name card with Profiel (soon), Uitloggen (guests: Inloggen). `state/auth.svelte.ts` holds the client/user (set by the root layout) and the single `signOut()`. Settings page is full width now (2 columns from lg); RULES updated. The top bar only exists on the dashboard so far.
- Phase 6 stats: every learn run is logged as a session (`StorageAdapter.saveSession/listSessions`, `SessionLog`); the runners save it after each block with growing totals under one id, so an abandoned run still counts. Tests are logged by their `TestRecord` (Supabase: same `practice_sessions` table, `mode='test'`; local: results are mapped to sessions in `listSessions`). No SQL change needed. Local learn log: `uiltje:sessions`, max 1000, imported/cleared with the guest data.
- Definitions (`stats/stats.ts`, pure TS): onder de knie = `streak >= 2`; accuracy = unaided correct / (correct + wrong) over `row_progress` (after-hint answers neutral); streak = consecutive local days with a session that has answers, still alive when only today is empty; "geoefend per dag" = answers per day; hardest onderdelen = most wrong, mastered ones left out. Days use the browser's local time.
- `/stats` loads every set + progress (`stats/library.ts`, 2 requests per set for accounts) and filters by vak client-side. `state/overview.svelte.ts` shares the dashboard data with the command palette (stale-while-revalidate, reset on login/logout). Palette and dashboard no longer use sample data except the friends card (friends are removed from the palette until they exist). The "Nieuw vak" links go to `/sets/new` (there is no vak page to create).
- Not done on purpose: friends/RLS for sharing (phase 6), changing username/display name, deleting an account.

## Terminology decision (stats wording)
- "gekend" is not used anymore. Mastered = **onder de knie**; the counted unit = **onderdeel** (one row, any template). "Rijtje" stays only as the name of a table-template list in editor/set screens, never in stats, leaderboard or dashboard counts. Spec in DESIGN.md §7, rule in PLAN §6 Statistics.
- Mastery rule (proposed, adjust if needed): row onder de knie = `streak >= 2` unaided; list/set = all rows; percentages = share of rows. The streak counter in `RowStats`/`row_progress` already supports this.
- Dashboard sample data fields renamed: `known` -> `mastered`, `percentKnown` -> `percentMastered`, `rijtjes` -> `practiced`.

## Phase 6 social (profile, friends, leaderboard, sharing)
- SQL `ai/sql/002_social.sql` (idempotent; tested twice in PGlite with stubbed `auth`/`storage`). New: `profiles.avatar_path/avatar_updated_at/show_on_leaderboard/friend_code`, `friendships`, `set_shares`, the `avatars` bucket and RPCs: `search_profiles`, `send_friend_request`, `respond_friend_request`, `remove_friendship`, `list_friendships`, `lookup_friend_code`, `add_friend_by_code`, `regenerate_friend_code`, `leaderboard`, `enable/disable_set_share`, `get_shared_set`, `send_set_to_friend`, `list_incoming_shares`, `get_incoming_share`, `respond_set_share`. Friends have no direct table access (no RLS read of each other's rows); everything is an RPC that returns only what the screen needs.
- Code: `lib/social/` (`types`, `rows` zod mappers, `api` Supabase implementation, `index` `getSocial()`, `period`, `copy`, `avatar-image`), `state/profile.svelte.ts` (own profile, loaded by the root layout after login, reset on logout). `Avatar` takes an optional `src` and falls back to the initial.
- Profile photo (owner decision, exception to "no files"): one file per user, `<uid>/avatar.webp`, upsert. The browser crops to a square, scales to max 512 px and encodes WebP (~30-60 KB; Safari < 17 hands back PNG, still accepted). Input limit 5 MB, bucket limit 2 MB, types jpeg/png/webp. The bucket is public so `<img>` works without signed URLs; the URL carries `?v=<avatar_updated_at>` to bust caches. Delete = remove the object and null the columns.
- Name/username edits write `profiles` and the sign-in metadata (`auth.updateUser`), then `invalidate('supabase:auth')`, because the header reads both from the metadata (`utils/user.ts`).
- Friends: search by username prefix (3+ chars, max 10) sends a request the other side accepts; an invite link `/i/<friend_code>` makes you friends at once (the link is the consent). "Nieuwe link" replaces the code, old links die. One row per pair (unique index on least/greatest).
- Leaderboard: you + accepted friends who did not switch it off (you always see yourself). `practiced` = answers (sum of `practice_sessions.total`, learn and test), accuracy = correct/total, both since the start of the local week (Monday) or month, passed by the client. Accuracy ranking needs 10+ answers. The UI says "antwoorden", not "onderdelen", because it counts answers, not distinct onderdelen.
- Sharing: link = `sets.share_token` (owner turns it on/off in the share dialog; the RPC reads it anonymously, so a guest can open `/s/<token>` and copy the set onto their device). Copy = `copyOfSet` with fresh ids, saved through `StorageAdapter`; progress is never shared; copies are independent (`forked_from` is not filled). Sending to a friend creates a `set_shares` row; the friend sees it under "Gedeeld met jou" on `/friends` and the copy marks it accepted. Sharing needs the set to be in the account (guest sets cannot be shared). Enabling a link bumps the set's `updated_at` (trigger).
- Login accepts `?next=/i/...` (relative paths only) for email and OAuth, so invite/share pages bring people back.
- Not built: notifications/badge for new requests or shares (they show on `/friends`), changing the avatar crop (always center), group leaderboards, per-set sharing permissions, palette entries for friends/profile.
- Pages use the layout's `data.user` (not `auth.user`) to decide guest vs signed in, because `auth.user` is only set in an effect (not during SSR) and would flash the guest card.

## Skeleton loading
- `ui/Skeleton.svelte` + global `.skeleton` class in `layout.css` (surface-2 with a moving highlight; static under reduced motion). Page skeletons live in `lib/components/skeleton/` (`CardSkeleton`, `CardGridSkeleton`, `SetPageSkeleton`, `StatsSkeleton`, `PracticeSkeleton` start/focus, `EditorSkeleton`, `SettingsSkeleton`, `RecentSetsSkeleton`). Used on: `/`, `/sets`, `/sets/[id]`, edit, both practice routes (+ `PracticeScreen`, `VocabRunner`), `/vakken`, `/vak/[subject]`, `/stats`, `/settings`.
- Pages fetch in `onMount`, so the skeleton is also what SSR renders. Dashboard skeletons only show while `overview.data === null && !overview.failed`, so a failed load does not shimmer forever. `/settings` shows its four option cards as skeleton until `settings.loaded`.
- `/login` has no data loading, so no skeleton. FriendsMini is static sample data, no skeleton.
- Not run in the real repo (no `npm run check` here): the changed files were compile-checked with the Svelte compiler only.

## Open questions
- How to guarantee 100% correct generated questions (stijlfiguren/grammar)? Ideas: curated verified base data + schema-constrained output + user approval.
- Which grammar topics and level-specific phrasing per level (vmbo/havo/vwo/gym)?
- Default Greek accent policy per level.
- Keybind-to-Greek input design (later).

## Errors & gotchas
- `/leaderboard` did nothing when clicked: the old placeholder `routes/leaderboard/+page.ts` (`redirect(307, '/friends')`) was still there, so its `load` ran before the real `+page.svelte` and bounced every visit to `/friends`. Deleted. When a route gets a real page, remove the placeholder redirect in the same change.
- Phase 1 was verified outside the repo (scratch project: tsc strict + noUncheckedIndexedAccess clean, 24 scenario checks). Run `npm run check` in the real project once; config files were not part of the zip.

## Useful snippets / commands
- Check: `npm run check`
- Dev: `npm run dev  
  
## Additional notes
- Fase 3: level is geen eigenschap van een set meer maar een globale accountinstelling (alleen AI gebruikt het). Schema v2, migrations[1] verwijdert `level`.
- Gasten slaan op in localStorage via StorageAdapter (`storage/local.ts`, key `uiltje:set:<id>`, concepten `uiltje:draft:<id>`). Limiet browser ~5MB.
- Editor: onvolledige sets worden als concept bewaard, pas opgeslagen als de strikte zod-validatie slaagt.
- Sjablonen zijn gegroepeerd in categorieën (TEMPLATE_CATEGORIES in editor/templates.ts): Rijtjes, Woorden, Grammatica & stijl. Alleen Rijtjes is bruikbaar; de rest toont "Binnenkort".
- Oefenen werkt in blokken (engine/blocks.ts): één stage van één rijtje, max 10 vormen. Het oude rij-voor-rij `LearnSession`/`TestSession` in session.ts wordt niet meer gebruikt (alleen `toProgressDeltas` nog).
- Omgekeerd (vorm → bepaling) accepteert alle prompts van het rijtje met dezelfde vorm; volgorde van woorden in de bepaling maakt niet uit.
## Phase 3/4 completion (toets, instellingen, meerdere sets)
- Toets: `buildTestBlocks` (blocks.ts) asks every form once per way, list by list, shuffled inside the list. The old test reused the learn ladder and asked each form up to 3 times (10 forms = 20 questions); fixed.
- Grade = 10 x score, one decimal, minimum 1,0. Passed from 5,5 (55%), judged on the rounded grade (`engine/grading.ts`). "Cijfer laten zien" is a setting.
- Test options: `questionCount` (random pick of forms, original order kept, `limitRows`), `timeLimitMinutes` (timer in PracticeRunner based on Date.now(); time up -> `forceFinish`, empty = wrong), retest of the wrong forms (`onlyRowKeys`, direction narrowed to the wrong ways, no timer or count).
- Retests (learn and test) use `flat: true`: one block per list, no ladder (a ladder cut 5 rows into 1-row blocks).
- Step-back is ported to blocks: 'stage' = when wrong answers in a block > max(4, 75% of the block) and `stageIndex > 0`, the previous stage blocks of the same list and way are inserted after the current one (`review: 'stage'`). 'row' = rows with more than 2 wrong answers in a block get an extra block (`review: 'row'`). Review blocks never trigger a step-back. `stepBackAfter` overrides the limit. The message is `session.notice`. The old row-by-row `LearnSession`/`TestSession` in session.ts are still unused (kept: `StepBack` and `toProgressDeltas` are imported from there).
- Strictness per session: 'set' | 'strict' | 'relaxed' (accents + macrons; case sensitivity stays per set), `engine/options.ts`.
- Vocab lists are shuffled even with a single stage. `PracticeRow.listKind` was added for that.
- Settings: `UserSettings` goes through `StorageAdapter.getSettings/saveSettings` (key `uiltje:settings`). State in `state/settings.svelte.ts`, loaded once in the root layout. Theme stays in `theme.svelte.ts` (localStorage directly, per device). Defaults: level vwo, practice forward/stage/set, grade shown, sound on.
- Test results: `StorageAdapter.saveTestResult/listTestResults` (key `uiltje:results`, max 50; deleting a set drops results that only concern that set). The start screen shows the last 3.
- Multi-set practice: `/vakken` (subjects from set summaries), `/vak/[subject]`, `/vak/[subject]/practice`. Subject slug = lowercase; SvelteKit already decodes route params, never `decodeURIComponent` them again (crashes on `%`). `PracticeScreen.svelte` runs start -> runner for one set or all sets of a subject. `PracticeConfig.selection` is setId -> listIds; progress is saved per set.
- Side panel (lg and up): progress, session totals and mistakes (learn: only the forms of wrong rows, never the answers), test status, shortcuts. The timer chip sits in the header on every screen size.
- Shortcuts: Enter/Tab (board), Alt+Enter (check / next / submit), Alt+H (hint, uses `event.code`; Firefox on Windows may open its History menu on Alt+H). BlockBoard ignores Alt/Ctrl/Cmd+Enter, otherwise the field handler and the window shortcut both fired and the block was skipped.
- Sound: WebAudio synth in `audio/sfx.ts`, no files. Confetti is a CSS component, hidden under prefers-reduced-motion.
- Editor: Woordenlijst template (kind 'vocab', columns Woord/Vertaling). Dimensions reorder with chevron buttons or Alt+Left/Right. The third template category keeps the name "Grammatica & stijl"; Stijlfiguren and Grammatica stay "Binnenkort" until phases 8-9.
- Dashboard sample data links to `/vak/latin` and `/vak/greek` and to sets that do not exist; real subjects use `/vak/latijn`. Fixed when the dashboard gets real data (phase 6).
- Verified in a scratch SvelteKit 3 project outside the repo: `svelte-check` 0 errors and 0 warnings, `vite build` ok, 23 engine scenarios, 26 browser checks (Playwright, light and dark, 1280px and 390px). `npm run check` has not run in the real repo yet.
- Gotcha: a click before hydration does nothing (SSR radios); browser tests must wait for networkidle.

- Vocab-algoritme is eigen ontwerp naar Quizlet Learn/StudyGo Leren (niveaus 0-4, 2x ongeholpen typen = geleerd, fout = terug naar niveau 1). Afstemmen in engine/vocab.ts.


## Social update: profiles, public/private sets, settings tabs, delete account
- SQL `ai/sql/003_profiles.sql` (run once after 002, idempotent): `sets.is_public` (default false), RPCs `get_profile(username)` (jsonb; own profile or an accepted friend's, otherwise null), `get_public_set(id)` (friend's public set or your own) and `delete_my_account()` (deletes the auth user, everything cascades). Friends still never read each other's tables.
- Public = visible to accepted friends on the profile, who can copy it (copy is independent and private). Visibility lives in the column, not in the set JSON (no schemaVersion bump); `StorageAdapter.saveSet` never touches it. The editor (`SetEditor`) has a Privé/Openbaar `Segmented` for accounts only and applies it after the set is saved (`applyVisibility`), so a new set gets its visibility with its first successful save.
- Profile statistics reuse the existing privacy switch `show_on_leaderboard` (copy now says "statistieken aan vrienden"). When off, the friend sees "houdt statistieken privé"; you always see your own. Stats: answers, accuracy, mastered rows (`streak >= 2`), tests, from `practice_sessions`/`row_progress`. The server returns only the end times of recent sessions (120 days, max 1000) and the client works out streak and "deze week" in the viewer's time zone with `stats/stats.ts`.
- Routes: `/profile` = own profile (`ProfileView`), `/u/[username]` = a friend's, `/openbaar/[id]` = copy a friend's public set (`SharedSetView`). Profile editing (photo, names, privacy) moved to `/settings?tab=profiel` (`settings/ProfileSettings.svelte`). Settings has tabs Profiel (accounts only) / Voorkeuren / Account (`Segmented`, `?tab=` kept with `replaceState`). Friends and leaderboard rows link to profiles (`PersonRow href`).
- Delete account: Account tab, confirm by typing your username. The app removes the avatar object first (storage rows cannot be deleted from SQL), then calls `delete_my_account()`, signs out locally and goes home. Not seen against the real project yet.
- Bell moved from the sidebar to the top bar next to the theme toggle (`TopBar`), on every screen size; removed from `Sidebar`.
- Bug: `+layout.svelte` effect_update_depth_exceeded and a laggy site. The `$effect` that calls `notifications.refresh()` after navigation read AND wrote `notifications.items` synchronously (the throttled path has no await before `this.items = ...`), so it re-triggered itself forever. Fix: call `refresh()` and `notifications.start()` inside `untrack()`. Rule of thumb: an effect that calls a state method must wrap it in `untrack()` unless it only reads what it should depend on.
- Not done: viewing a friend's streak chart, public sets for non-friends, per-set visibility in the set page menu or `/sets` cards (only in the editor).

- Top bar on every page: `AppShell` renders `TopBar` (search, bell, theme, profile menu; no title) above the content on every page except `/` (the dashboard keeps its own bar with the greeting) and the bare screens (login, practice). `TopBar`'s `title` is optional.

## Practice modes: Meerkeuze, Flashcards, Dictee, Spelling, Hints
- One engine for all five: `engine/cards.ts` (`CardSession`, pure TS). One pass over the selected rows, in both directions when chosen; wrong cards are not repeated, the result offers "Alleen fouten oefenen". Works on any row (prompt/answers), for vocab lists and rijtjes alike. Route: the practice menu links to `?mode=choice|flashcards|dictation|spelling|hints`; `PracticeScreen` sends those to `CardStart` (lists + direction) and `CardRunner`, everything else stays as before.
- Meerkeuze: up to 4 options, distractors from other rows (same list first), keys 1-4. Needs 2+ rows. Flashcards: flip (click or space), "Wist ik" / "Nog niet" (arrows or 1/2); self-rated, so progress is NOT changed and no session is logged. Dictee: the term is read aloud by the browser (`utils/speech.ts`, Web Speech API, no files), typed back; language from the subject name (Latin has no voice in most browsers: Italian is used); start is disabled when the browser cannot speak. Spelling: like typing, but accents always count and a wrong answer shows which letters are wrong (`markLetters`, position based). Hints: typing with the hint ladder (letter, pattern, answer = wrong); a correct answer after a hint is "assisted".
- Saving: progress per answer like the other modes (`applyDeltas`), and one session log entry (`mode: 'learn'`, so streak and the leaderboard count them). Deltas are drained after each answer and the per-row counters restart, because a row can come back in the other direction.
- Not seen in a browser yet; engine scenario run with tsx (all five modes) and the components compile with 0 warnings.

## Removed: tips, motivation and the sidebar card
- On request: no more welcome, daily weetjes/motivation, "welkom terug", "reeks vasthouden" reminders and no illustrated card ("Kleine stapjes...", `SidebarCard.svelte`, deleted) in the sidebar. Notifications are now only: friend requests, sets sent to you, accepted requests, and streak/answer milestones (kept: they report something real; say if they should go too). `notifications/content.ts` has just the milestone copy; stored old local items of removed kinds are ignored (`KEPT_KINDS` in `state/notifications.svelte.ts`). The old localStorage keys (`tip-counter`, `tip-day`, `last-visit`, `welcomed`) are simply no longer used.
- Correction (same day): the sidebar card stays (`SidebarCard.svelte` restored) and the one-time welcome notification stays (first visit per device, no facts). Still gone: weetjes, motivation, "welkom terug" and the streak reminder (owner finds them unprofessional "AI"). Notifications: welcome, friend requests, shares, accepted requests, streak/answer milestones.

## Phase 7 polish: themes, mobile, animation (2026-10-21)
- Themes: `data-theme="<id>"` is ALWAYS set on `<html>` (inline script in `app.html` before first paint, then `state/theme.svelte.ts`). Ids: light (Crème), salie, lavendel, zeemist, dark (Cacao), middernacht, bos. CSS blocks `[data-theme='x']` in `routes/layout.css`; the same attribute on any element scopes a theme (theme picker previews). The old `prefers-color-scheme` CSS block is gone: "Automatisch" is resolved in JS. Keep THEMES (state), the ids in app.html and the CSS blocks in sync when adding a theme. Contrast of text, muted text, button text and primary text was checked (>= 4.5:1) for every theme.
- localStorage: `uiltje-theme` (fixed theme id, absent = automatic) and `uiltje-theme-pair` (`{"light":"salie","dark":"bos"}`, the light/dark theme used by Automatisch and by the quick toggle).
- Phone type scale: `--text-xs` and `--text-sm` are larger under 640px (layout.css). Do not use fixed text sizes like `text-[0.7rem]`.
- Animation toolkit (layout.css): `--ease-spring`, `.rise` (+ `Card rise={n}` prop), `.lift`, `.grow-x`/`.grow-y`/`.ring-arc` (use `@starting-style`, bars grow from empty), `.menu-pop`, modal in/out via `@starting-style` + `allow-discrete`, `ui/CountUp.svelte`, `Owl bob`. Page transitions: `onNavigate` in `+layout.svelte` with the View Transitions API, `main` is the `page` transition, sidebar and tab bar have `.vt-chrome` and stay put. Everything respects `prefers-reduced-motion`.
- Browser support: `@starting-style`, `allow-discrete` and view transitions need a recent browser; older ones simply skip the animation.
- Checked in a scratch SvelteKit project: svelte-check clean and screenshots at 390px and 1280px. Fixed the 7 older svelte-check errors at the same time: `engine/cards.ts` (typed the flatMap result as `{ row; way: CardWay }[]`), `Card` now accepts `aria-hidden` (three skeletons), `settings` uses `new URL(page.url.href)`. Not run on a real phone.

## Greek keyboard per set (2026-10-21)
- `SetSettings.keyboard: 'default' | 'greek'` (schema v3; migration 2 -> 3 only needs the default, filled by `normalizeSet`). Chosen in the set editor (card "Toetsenbord", next to title/subject), stored with the set JSON, so no SQL change.
- Conversion lives in `engine/greek.ts` (`toGreek`, pure) and the action `utils/keyboard.ts` (`use:greekKeyboard={on}`, capture-phase `input` listener, keeps the caret). Layout: a=α b=β g=γ d=δ e=ε z=ζ h=η q=θ i=ι k=κ l=λ m=μ n=ν x=ξ o=ο p=π r=ρ s=σ t=τ u=υ f=φ c=χ y=ψ w=ω, Shift = capital. Marks after the letter: `'` acute, `` ` `` grave, `=`/`~` circumflex, `)` smooth, `(` rough, `|` iota subscript, `"` diaeresis. `/` is NOT used (it separates answers in the checker). Final sigma ς is automatic. Idempotent.
- Applies to: row prompt + answer fields in the editor (not titles, column names, tags, paste modal, JSON), and every answer input in practice (VocabRunner, CardRunner, BlockBoard via `Input keyboard`). In BlockBoard only for `way === 'forward'`; the reverse way asks for a grammar label (e.g. "ev nom") that must stay Latin. Vocab/cards convert every typed answer of the set, in both directions (so a Dutch answer cannot be typed in a Greek set).
- Existing text is not converted when the setting is switched on; only new typing is.
- Not run in the real repo (no node_modules in the zip): `toGreek` and `parseStudySet` (v2 -> v3) were run in a scratch dir; run `npm run check` for the Svelte parts.
