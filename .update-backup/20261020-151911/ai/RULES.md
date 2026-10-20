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
- Never store files or binary data. Supabase holds text/JSON only.
- Secrets (Gemini key, service keys) only on the server; never in `PUBLIC_` env vars or client code.
- Accessibility: labels on inputs, visible focus, keyboard navigable, respect `prefers-reduced-motion`.
- Laptop first, but every screen must work on mobile.

## Design rules
- Cozy, calm: warm palette, rounded corners, soft shadows, Fredoka (headings) + Nunito (body).
- Chunky buttons with a pressed state. Sounds subtle and mutable. Confetti rare and light.
- Light and dark theme must both look finished.
- Stable layout: focused flows (practice, results) share one content width (`max-w-3xl`); overview and setup pages (set page, editor, practice start, settings) use the full width; setup screens show the main choice first and put the rest under "Meer opties" (use `ui/Segmented.svelte` for short choices, not big radio cards); `html` keeps `scrollbar-gutter: stable`; a state change (feedback, notices, status messages) must never move buttons or inputs: reserve space with `min-h-*` slots instead of inserting and removing blocks; primary buttons whose label changes get a `min-w-*`.
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
