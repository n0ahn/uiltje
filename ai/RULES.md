# RULES.md — Uiltje

All project docs live in `ai/` (PLAN.md, TODO.md, NOTES.md, RULES.md). Only `src/` and `ai/` are shared with AI; configs (svelte.config, adapter, etc.) are already set up, do not change them.
Always read this file, ai/NOTES.md and the relevant ai/PLAN.md section before working.

## Working style
- Ask when unsure instead of guessing.
- Be token efficient. If a change is one line or one function, show only that change, not the whole file.
- When delivering multiple files, send each as a separate file.
- Update TODO.md (check items) and NOTES.md (errors, decisions) after each task.

## Stack rules
- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`). No legacy `export let`, no `$:`; use `.svelte.ts` for shared state.
- TypeScript strict, no `any`. Prefer `type` imports.
- Tailwind CSS 4: styles/theme in `src/routes/layout.css` (`@import 'tailwindcss'`, `@theme`). No app.css, no tailwind.config.js. Use theme tokens, no hardcoded colors in components.
- npm only.
- Hosting Vercel (`adapter-vercel`). Supabase via `@supabase/ssr`.
- No Vitest/Playwright. Verify with `npm run check` and lint.

## Code rules
- Code, comments and docs in English. All user-facing text in Dutch.
- Engine code (`lib/engine`, `lib/schema`) is pure TS: no Svelte, DOM or Supabase imports.
- Validate all set JSON with zod at every boundary (import, DB read, AI output).
- Access storage only through `StorageAdapter`, never call localStorage/Supabase directly from components.
- Small focused components; UI primitives in `lib/components/ui`.
- Never store files or binary data. Supabase holds text/JSON only. One exception, decided by the owner: the profile photo, a single small image per user in the `avatars` Storage bucket (`<user id>/avatar.webp`, shrunk to 512 px in the browser, bucket limit 2 MB, input limit 5 MB). No other uploads.
- Friends, leaderboard and sharing live in `lib/social` (`getSocial()`), account only, through security-definer RPCs from `ai/sql/002_social.sql`. Friends never read each other's tables; the leaderboard exposes aggregates only (answers, accuracy), and a user can switch it off in their profile.
- Secrets (Gemini key, service keys) only on the server; never in `PUBLIC_` env vars or client code.
- Accessibility: labels on inputs, visible focus, keyboard navigable, respect `prefers-reduced-motion`.
- Laptop first, but every screen must work on mobile.

## Design rules
- Cozy, calm: warm palette, rounded corners, soft shadows, Fredoka (headings) + Nunito (body).
- Chunky buttons with a pressed state. Sounds subtle and mutable. Confetti rare and light.
- Light and dark theme must both look finished.
- Stable layout: focused flows (practice, results) share one content width (`max-w-3xl`); overview and setup pages (set page, editor, practice start, settings) use the full width; setup screens show the main choice first and put the rest under "Meer opties" (use `ui/Segmented.svelte` for short choices, not big radio cards); `html` keeps `scrollbar-gutter: stable`; a state change (feedback, notices, status messages) must never move buttons or inputs: reserve space with `min-h-*` slots instead of inserting and removing blocks; primary buttons whose label changes get a `min-w-*`.
- Loading: every page and every async-loaded section shows a skeleton, never a bare "Laden…" text or an empty box. Use `ui/Skeleton.svelte` blocks inside a skeleton component in `lib/components/skeleton/` that mirrors the final layout (same grid, cards and `min-h-*`), so nothing jumps when the data arrives. Static headings stay real; only data-dependent content is skeletonised. The skeleton root has `role="status"`, `aria-busy="true"` and an `sr-only` "Laden…"; blocks are `aria-hidden`. The shimmer stops under `prefers-reduced-motion`. A new page or async section is not done without its skeleton.
- Menus, popovers and dropdowns use the Popover API (top layer, see `ui/Dropdown.svelte`), never `z-index` on a normal element.
- Icons come from Lucide through `ui/Icon.svelte` only; do not hand-draw SVG paths.
- Sounds are tactile, not tonal: noise tick plus soft thump for clicks, bell-like plinks for rewards (`audio/sfx.ts`). Keep them short and quiet.

## Data rules
- Follow the schema in PLAN.md §3 exactly; bump `schemaVersion` and add a migration for any change.
- AI-created content is always previewed and editable before saving.
- Generated questions must be pre-generated, never produced while the user waits, and must follow the correctness strategy in NOTES.md once decided.

## Delivery rules
- Every change is delivered as ONE zip, never as loose files and never as a full copy-paste of code in chat. The user saves it in `./updates/` and runs `./update.sh`.
- The zip contains only the files that are new or changed, at their real project paths (`src/...`, `ai/...`), so it can be merged over the project. Never include config files or `node_modules`.
- Name it `updates/uiltje-update-YYYYMMDD-HHMM.zip` (the script always applies the newest zip in `./updates`).
- Deleted files go in a `DELETE.txt` at the zip root, one project path per line; `update.sh` removes them.
- Update `ai/TODO.md`, `ai/NOTES.md` and `ai/NEXT.md` inside the same zip. Do not touch `update.sh` unless it needs fixing.
- Every delivered update that changes something a user can see or use gets an entry at the TOP of `CHANGELOG` in `src/lib/changelog.ts`, in the same zip: next version as `id` and in the title, today's date, `size` and short Dutch lines marked `new`, `changed` or `fixed`. `UpdateModal` then shows it once per device to everyone, guests included. Skip it only for purely internal changes (refactors, docs).
- Versioning: the app is pre-1.0. The first version is 0.90; every update after it counts up one step: 0.91, 0.92, 0.93, ... The AI decides whether an update is `big` or `small` and sets `size` accordingly (shown in the modal), but this does not change the numbering. Never jump to 1.0 on your own: only the owner decides when the app is 1.0.
