# DESIGN.md — Uiltje UI specification

Self-contained visual spec so no AI needs to see the reference images. All UI copy is Dutch; this document is English. Hex values are close approximations of the references, not exact samples: treat them as the source of truth from now on.

Rules: use tokens only (see §2), no hardcoded colors in components. Laptop first, mobile must be equally comfortable. Light and dark themes must both look finished. Respect `prefers-reduced-motion`.

---

## 1. References (what they looked like, and what we take from each)

1. **Dashboard mockup ("Focus" study app), light + dark, desktop + mobile.** Warm cream paper background, soft rounded cards with faint borders and soft warm shadows, left sidebar with leaf logo and line icons, big friendly greeting, illustrated hero card (lamp, books, plant), subject cards with colored icon tiles and thin progress bars, streak card with flame, small botanical sprigs and 4-point sparkles as decoration, bottom tab bar on mobile, splash screen with a cozy window illustration and a dark pill button. Dark variant: very dark warm brown background, same layout, hero illustration becomes a sunset forest/cabin scene, accents stay terracotta/sage. A 7-swatch palette: cream, sand, wheat, clay, terracotta, sage, dark brown.
2. **"Menu buttons" sheet.** Chunky square buttons: cream fill (#FFF4DE), thick plum outline (~3px, #6E4F6B), rounded corners (~22% of size), a visible darker 3D bottom edge (~6px, a deeper plum/tan), glossy-feeling but flat. Icons inside are solid plum, rounded, simple (gamepad, vibrate, music note, hamburger, megaphone, X, check, speaker, gear/flower, refresh, redo, power, pause, prev/next arrows, camera, question mark, info, mail, star, home, trophy, cart, stars with numbers 1–5). Mint-green background with rounded bushes and small butterflies in the corners. The title uses a pink bubble lettering with a plum outline.
3. **"Daily Bubble" font sheet.** Fat, inflated, bubble letters with a small white highlight stripe at top-left of each glyph, cream on dark brown, pink 4-point sparkles. Paid font, so we do NOT use it. We use Fredoka (similar roundness) for headings.

What we combine: calm dashboard/layout structure from (1), tactile chunky buttons and game-like warmth from (2), bubbly headings from (3) via Fredoka. Not used from (1): pomodoro timer, calendar strip, tasks list, notes (not in scope).

---

## 2. Design tokens

Define in `src/routes/layout.css` with Tailwind 4 `@theme`. Theme switching via `data-theme="light|dark"` on `<html>` (default follows `prefers-color-scheme`).

### 2.1 Palette

Light theme:

| token | hex | use |
|---|---|---|
| `--color-bg` | #F7F0E1 | page background (cream paper) |
| `--color-surface` | #FFF9EC | cards, panels |
| `--color-surface-2` | #F1E6D0 | sunken areas, input wells, table stripes |
| `--color-border` | #E4D5B8 | card borders, dividers |
| `--color-text` | #4A3B35 | body text (deep brown) |
| `--color-text-muted` | #8A7568 | secondary text |
| `--color-ink` | #6E4F6B | plum: outlines of chunky buttons, mascot outline, icons on chunky buttons |
| `--color-primary` | #C97B55 | terracotta: primary actions, active nav |
| `--color-primary-edge` | #A85F3E | 3D edge of primary button |
| `--color-primary-soft` | #F3D9C8 | tinted backgrounds for primary |
| `--color-sage` | #8FAE8B | success, progress fill, "Grieks"-neutral accents |
| `--color-sage-edge` | #6F916B | edge for sage buttons |
| `--color-sage-soft` | #DDE8D6 | correct-answer tint |
| `--color-wheat` | #D8B98A | decorations, stars, secondary accent |
| `--color-clay` | #B88B6A | secondary decorations |
| `--color-rose` | #E8A5A0 | soft error accents, hearts |
| `--color-rose-soft` | #F7DAD5 | wrong-answer tint |
| `--color-sky` | #7FA2C4 | info, Greek subject accent |
| `--color-lilac` | #9A86B8 | extra subject accent |
| `--color-flame` | #E88B3C | streak flame |
| `--color-mint` | #BCEBD2 | "game world" backdrop (login/results only) |
| `--color-pink` | #FFA8DC | bubble title accent (login/hero only, very sparingly) |

Dark theme (same token names):

| token | hex |
|---|---|
| bg | #241C19 |
| surface | #2F2622 |
| surface-2 | #3A302B |
| border | #4A3D36 |
| text | #F3E7D3 |
| text-muted | #B8A593 |
| ink | #E6CFA8 (light outline color so chunky buttons stay readable) |
| primary | #D98B63 |
| primary-edge | #A8613F |
| primary-soft | #4A3226 |
| sage | #9DBB98 |
| sage-edge | #6F916B |
| sage-soft | #2F3D2E |
| rose-soft | #4A2E2B |
| mint | #2F4A3C (deep mint, used instead of bright mint) |
| others | same as light, slightly desaturated if they look too bright |

Subject accent colors (icon tile + progress bar): Latijn = terracotta `primary`, Grieks = `sky`, extra subjects cycle through `sage`, `lilac`, `wheat`.

State colors: success = sage, error = rose (never harsh red), warning = flame, info = sky.

### 2.2 Typography

- Headings, buttons, numbers in stats: **Fredoka** (variable, weights 500–700), slightly tracking `0.01em`.
- Body, inputs, tables: **Nunito** (variable, weights 400–800).
- Greek and Latin answers in inputs and tables: Nunito handles Latin with macrons and polytonic Greek; if a glyph is missing, fall back to `"Noto Serif", serif` for Greek polytonic.

Scale (rem, desktop / mobile):

| role | desktop | mobile | weight |
|---|---|---|---|
| display (hero, results score) | 3.25 | 2.5 | Fredoka 700 |
| h1 | 2 | 1.65 | Fredoka 700 |
| h2 | 1.5 | 1.3 | Fredoka 600 |
| h3 | 1.2 | 1.1 | Fredoka 600 |
| body | 1 | 1 | Nunito 400 |
| small | 0.875 | 0.875 | Nunito 500 |
| answer input | 1.25 | 1.25 | Nunito 600 |

### 2.3 Shape, spacing, shadow

- Radius: cards 24px, large panels 28px, buttons 18px, inputs 16px, chips/pills 999px, icon tiles 14px.
- Spacing base 4px; common steps 8, 12, 16, 24, 32, 48. Page padding 32px desktop, 16px mobile. Card padding 20–24px.
- Card: `background: surface; border: 1px solid border; border-radius: 24px; box-shadow: 0 6px 18px -8px rgb(74 59 53 / .22)` (dark theme: shadow `rgb(0 0 0 / .45)`).
- Focus ring: 3px outline `primary` at 55% opacity, 2px offset, always visible on keyboard focus.

---

## 3. Core components

### 3.1 Chunky button (the signature element)
Square or pill with a visible 3D bottom edge, like the menu-buttons sheet.
- Structure: `border: 2.5px solid ink; border-radius: 18px; padding: 10px 20px; font: Fredoka 600; box-shadow: 0 5px 0 0 <edge-color>`.
- Variants: **primary** (fill primary, edge primary-edge, text cream), **cream/secondary** (fill #FFF4DE in light, surface-2 in dark, edge #D9C5A0 / border color, text ink), **sage** (success/confirm), **ghost** (no fill, no edge, text underline on hover), **danger** (rose fill, only for delete).
- Sizes: sm 36px high, md 44px, lg 56px. Icon-only buttons are square (44 or 56px) with radius 22%.
- States: hover → translateY(-1px), edge grows to 6px; **pressed** → translateY(4px) and shadow shrinks to `0 1px 0` (the button "sinks"), 90ms; disabled → 45% opacity, no edge motion; focus → ring.
- Sound: soft click on press (see §8). Icon buttons from the sheet: play/next/prev, check, X, home, trophy, star, gear, speaker, music, info, help, refresh, redo.
- Numbered star buttons (1–5): used as level/stage markers (stage 3 of 5 = three filled stars) and difficulty.

### 3.2 Card
As in §2.3. Optional "illustrated" variant: image area on one side with a soft gradient mask. Interactive cards lift 2px on hover and show a 2px border in their accent color.

### 3.3 Progress bar
Height 10px, radius 999, track `surface-2`, fill = accent color, soft inner highlight line on top (1px white at 35%). Animates width 400ms ease-out. Variant "stage dots": row of rounded pills/leaves, completed ones filled sage, current one pulsing gently, upcoming outlined.

### 3.4 Progress ring
Circular, 8px stroke, round caps, track `surface-2`, fill accent; center shows fraction like `3/6` in Fredoka 700 with a small caption below. Used for stage progress and subject progress.

### 3.5 Input (answer field)
Height 48–52px, radius 16px, `surface-2` fill, 2px border `border`, text Nunito 600 1.25rem, centered or left per column. Focus: border `primary`, fill `surface`. States after checking: **correct** → border sage, fill sage-soft, small check icon fades in right; **wrong** → border rose, fill rose-soft, 160ms horizontal wiggle (±4px), no red text. **Revealed** (after hint 3) → dashed border, text muted.
Placeholder is a faint dot pattern or the pattern mask hint (e.g. `m _ _ _ a`), never instructional text.

### 3.6 Chips and badges
Pill, 28px high, `surface-2` fill, small text. Active chip: primary-soft fill, primary text, 1.5px primary border. Count badges (streak etc.) in Fredoka.

### 3.7 Toast
Bottom center (desktop) or above the tab bar (mobile), pill shape, surface fill, ink border, 3D edge like a button, owl icon left, auto-hide 3s.

### 3.8 Modal / sheet
Desktop: centered card, max-width 520px, backdrop `rgb(36 28 25 / .45)` with blur 2px. Mobile: bottom sheet with a drag handle, radius 28px top.

### 3.9 Decorations (use sparingly, never behind text that must be read)
- 4-point sparkles in wheat/terracotta, 12–20px, 2–4 per screen, slow twinkle (opacity 0.5↔1, 3s).
- Leaf sprigs (thin stem with 5–7 small leaves, sage/clay) tucked into card and sidebar corners, ~40% opacity.
- "Bush" shapes (rounded blobs with a highlight and plum outline) and small butterflies only on mint "game world" screens (login, results).
- Tiny plant in a pot (small SVG) next to hero/progress cards.

---

## 4. The owl mascot ("Uiltje")

Flat SVG, same outline style as chunky buttons (2.5px `ink` outline, rounded joins).
- Shape: plump rounded-egg body (wider at the bottom), two small tufts on top of the head, soft round cream belly patch with 3 faint feather scallops, two tiny feet, small wings hugging the body.
- Colors: body warm brown #A9805F, darker wing #8C6648, belly cream #FFF4DE, beak and feet terracotta-orange #E0955A, eyes large cream circles with dark brown pupils and a white highlight dot (top right).
- Poses (separate SVG variants): **idle** (blinks every ~5s), **happy** (eyes as closed arcs `^ ^`, little blush circles), **thinking** (one wing up to the cheek, eyes looking up-left), **cheer** (wings up, mouth open beak, used with confetti), **sleepy** (eyes closed, small "z" sparkles, used for empty states), **oops** (small sweat drop, eyes slightly wide, used on mistakes).
- Sizes: 24px (toast/avatar), 64px (hint bar, panel), 140–200px (empty states, results, login).
- Appears on: sidebar bottom card (sitting on a branch), hint bar, results screen, empty states, login screen (sitting on a stack of books).

---

## 5. Layout and navigation

### 5.1 Desktop (≥1024px)
- Left **sidebar** 248px wide, `surface` fill, right border `border`, full height, fixed. Top: leaf-owl logo mark (28px) + wordmark "Uiltje" in Fredoka 700. Nav items (icon 22px rounded line icons + label, 44px high rows, radius 14px): Home, Vakken, Mijn sets, Vrienden, Statistieken, Instellingen. Active item: `primary-soft` fill, `primary` text and icon, a 4px primary bar on the left edge with rounded ends. Bottom of sidebar: illustrated card (≈ 200×170) with a soft sunset/window scene, the owl sitting on a branch and the text "Kleine stapjes, grote vooruitgang." in small italic Fredoka; below it a user chip: avatar circle (initial on colored background), display name, `@username`, caret menu (profiel, uitloggen).
- **Top bar** in the content area: greeting left, search pill (360px, magnifier icon, placeholder "Zoek sets, vakken of vrienden…", `Cmd/Ctrl+K` hint chip on the right) and avatar circle right.
- Content max-width 1280px, centered, 32px padding. Dashboard uses a 12-column grid with 24px gap: main area 8–9 columns, right rail 3–4 columns (320px).

### 5.2 Tablet (640–1023px)
Sidebar collapses to a 72px icon rail (labels as tooltips). Right rail drops below the main content.

### 5.3 Mobile (<640px)
- No sidebar. **Bottom tab bar** 64px high + safe area, `surface` fill, top border, 5 tabs: Home, Vakken, Vrienden (trophy icon), Statistieken, Instellingen. Active tab: primary icon + label, a small pill highlight behind the icon.
- Top: greeting + avatar, search as an icon button. Single-column cards, 16px padding, 12px gaps.
- Practice screen hides the tab bar for focus (back arrow top left).

---

## 6. Screens

All text Dutch. Placeholder data in brackets.

### 6.1 Dashboard (`/`)
1. Greeting row: "Goedemorgen/Goedemiddag/Goedenavond, [naam]" with a small sun/moon icon, subtitle "Een beetje oefenen per dag brengt je ver." (h1 + muted text). Right side: search pill + avatar.
2. **Hero card "Verder waar je was"** (spans main width, 220px high, two parts): left text: small label "Verder oefenen", set title (Fredoka h2, e.g. "Latijn: 1e declinatie"), stage text "Stap 3 van 5", a progress bar, row of two buttons: primary "Verder oefenen" (play icon), cream "Naar de set". Right part: illustration (light theme: cozy desk with lamp, stack of books, plant; dark theme: sunset over a forest with a small cabin), masked with a soft left-fade so it blends into the card. If there is no recent set: owl sleepy + "Maak je eerste set" button.
3. **"Jouw vakken"** section: heading + "Alles bekijken" link. Grid of subject cards (4 columns desktop, 2 mobile). Each card ≈ 200×150: top-left 44px icon tile (accent color at 15% fill, solid accent icon), name (Fredoka h3, e.g. "Latijn"), muted subline (e.g. "5 sets"), at the bottom "12 van 20 onderdelen onder de knie" and a thin progress bar in the accent color. Last tile is a dashed-border card "+ Nieuw vak".
4. **"Recente sets"** list (card with rows): each row: small colored icon tile, set title, subject chip, "x% onder de knie", chevron; hover highlights row with `surface-2`.
5. Right rail:
   - **Streak card**: flame icon (flame color), big number "5 dagen" (Fredoka display), caption "Blijf oefenen om je reeks te houden", a row of 7 tiny day bars (this week) with filled bars for practiced days.
   - **Vrienden deze week** mini leaderboard card: title with trophy icon, top 3 rows (rank pill, avatar, name, number of onderdelen practised this week), "Hele ranglijst" link.
   - **Snelle acties**: four icon buttons in a 2×2 or 4×1 row (round-ish chunky): "Nieuwe set" (plus), "Importeer" (arrow into tray), "Deel set" (share), "Vriend toevoegen" (person plus). Labels beneath in small text.
6. Decorations: a leaf sprig at the bottom corner of the right rail, two sparkles near the hero.

### 6.2 Vak page (`/vak/[subject]`)
Header with big subject icon tile, name, summary line ("5 sets · 80 onderdelen · 64% onder de knie"), primary button "Nieuwe set". Below: optional group headings (folders) as collapsible sections with a chevron; inside, a grid of **set cards** (3 columns): title, small description, chips for level and number of rijtjes, progress ring or bar, footer with two buttons "Oefenen" (primary sm) and "Bewerken" (ghost). Empty state: owl sleepy, "Hier staat nog niets. Maak je eerste set."

### 6.3 Set page (`/sets/[id]`)
- Header: back arrow, set title (h1), meta chips (vak, niveau), overflow menu (hernoemen, delen, dupliceren, verwijderen) and primary "Oefenen" button + cream "Toets" button.
- Body: list of **rijtjes grouped by `group`** ("Groep 1", "Groep 2a"…). Each rijtje is a card row with a checkbox (to select it for practice), title, small mastery bar, and a tiny preview of its first 2 rows. A sticky bottom action bar appears when ≥1 rijtje is selected: "[n] rijtjes geselecteerd · Alles combineren" plus buttons "Leren" and "Toets". A "Selecteer alles" chip allows practicing all declensions at once.

### 6.4 Practice, learn mode (`/sets/[id]/practice`)
Distraction-free; sidebar hidden, a slim top bar only.
- **Top bar**: back arrow (X icon button) left, set + rijtje title center, mode chip ("Leren"), speaker/mute icon button and settings gear right.
- **Stage indicator** under the bar: "Stap 2 van 5 · alleen enkelvoud" with stage dots (see §3.3) or numbered stars (1–5).
- **Main card** (max-width 720px, centered, generous padding 32px): the **answer grid**: a two-column table. Left column (≈ 38%): prompt labels such as "ev nom", "ev gen"… in muted pills (surface-2, Fredoka 500). Right column: answer inputs (§3.5), one per row, stacked with 10px gap. The first empty input is auto-focused. **Enter** or **Tab** moves to the next input; **Enter** on the last input checks all rows; each input is also checked live on leaving the field. Checking marks fields correct (sage) / wrong (rose + wiggle), correct rows lock and show a tiny check; wrong rows stay editable (infinite attempts).
- **Hint bar** at the bottom of the card: owl (64px, "thinking" pose) and three chunky buttons: "Hint 1: eerste letter", "Hint 2: patroon", "Hint 3: toon antwoord". Using them updates the focused input (letter, `m _ _ _ a` mask, or reveal). Hint 3 marks the row as missed.
- **Right side panel (laptop ≥1280px only)**: a card with the progress ring (rijtjes mastered in this stage, e.g. `4/10`), a small stat list (fouten, hints, tijd), session streak, and the owl reacting (idle → happy after 3 correct in a row, oops after a mistake).
- **Footer hint line** (muted, small): "Tab: volgende · Enter: controleren · Esc: pauze". On mobile this line is hidden and a sticky bottom row holds the primary button "Controleer" full width.
- **Stage complete**: card overlay "Stap voltooid!" with owl cheer (64px), sparkle burst, sage sound arpeggio, button "Volgende stap". If too many mistakes: gentle "We gaan een stapje terug" message with owl oops and a calm tone, no punishment visuals.
- Combined sessions show a small chip row with the selected rijtjes names above the grid.

### 6.5 Test mode
Same grid, but: no per-field feedback, no hints, no wiggle. Top bar chip "Toets", a thin overall progress bar (answered/total). A single primary button "Inleveren" at the bottom. Confirmation modal if blanks remain ("Je hebt nog [n] lege velden").

### 6.6 Results screen
Mint "game world" backdrop (bushes bottom corners, two butterflies, sparkles). Central card: owl (cheer if passed, happy otherwise, never sad), display score "86%" in Fredoka (display size) inside a progress ring, line "[x] van [y] goed", time. Confetti only if the user passed (≥ the pass threshold, default 80%), ~40 pieces in palette colors, 1.2s, once. Below: collapsible "Fout beantwoord" list (prompt → jouw antwoord (strikethrough, rose) → juiste antwoord (sage)). Buttons: primary "Alleen fouten oefenen", cream "Opnieuw", ghost "Terug naar set". Saves a `practice_session`.

### 6.7 Set editor (`/sets/[id]/edit`, `/sets/new`)
- Two-pane on laptop: left (320px) set meta form (titel, vak select, niveau select, folder, strictness toggles for accenten/macrons); right: **rijtjes editor**.
- Rijtjes editor: tabs or vertical list of rijtjes with a "+ Rijtje" chunky button, drag handles to reorder, group name field. Selected rijtje shows an editable **table** with columns "Vorm" and "Woord" (headers renameable), tags columns collapsed behind a "Tags tonen" toggle (number/case/person…), each row: drag handle, prompt input, answers input(s) with "+ variant" chips, delete icon. Keyboard: Enter adds a new row, Tab moves across cells, Cmd/Ctrl+Z undo. A "Plak uit tekst" button opens a modal for pasting tab/newline-separated text into rows. Top right: "Opslaan" primary (with unsaved-dot indicator), "JSON" cream button (import/export modal with a code box and validation errors listed in plain Dutch).
- Autosave to local storage every 2s for guests, to Supabase for logged-in users, with a "Opgeslagen" toast.
- Mobile: one pane at a time with a segmented control (Info / Rijtjes), rows as stacked cards.

### 6.8 Login (`/login`)
Mint backdrop with bushes and butterflies. Centered card (max 400px): owl on a stack of books (140px) peeking over the card top, title "Uiltje" in Fredoka display with the pink accent on a text-stroke (bubble-style: outline ink, fill pink, subtle highlight), buttons "Doorgaan met GitHub" (and Google when enabled) as chunky cream buttons with provider icons, an "of" divider, email/password form (inputs as §3.5), toggle link between inloggen/registreren, registration adds weergavenaam and gebruikersnaam fields, link "Verder als gast" (ghost). Error text appears under the form in rose with a small oops owl.

### 6.9 Friends and leaderboard (`/friends`, `/leaderboard`)
- Friends page: search field (finds by username, from 3 characters) with result rows (avatar, display name, `@username`, chunky "Toevoegen" button), pending requests section (accept/decline icon buttons), friends list.
- Leaderboard: period segmented control (Deze week / Deze maand), metric chips (Meest geoefend / Hoogste nauwkeurigheid). Podium for the top 3 (card heights 140/110/90px, trophy and star icons, avatars with colored rings), rest in rows with rank pills. The current user's row is highlighted with `primary-soft`.

### 6.10 Statistics (`/stats`)
Cards grid: streak, totaal onderdelen onder de knie, sessies deze week, nauwkeurigheid; line/bar chart of practice per day (soft sage bars, rounded tops, no gridlines except a faint baseline); "Moeilijkste vormen" list (prompt + answer + miss count with small bars); filter by vak. Chart colors from subject accents; tooltips as small cards.

### 6.11 Settings (`/settings`)
Sections as cards: Profiel (weergavenaam, gebruikersnaam), Uiterlijk (thema: licht/donker/systeem), Geluid (aan/uit, volume slider with chunky thumb), Nakijken defaults (accenten, macrons), Leren (stap terug-gedrag), Account (uitloggen, verwijderen). Toggles are chunky: pill track with a round knob and 3D edge.

### 6.12 Splash / onboarding (mobile first-run)
Full-screen illustration of a cozy window scene at sunset (top 55%), below it a rounded sheet with the heading "Betere gewoontes. Grotere dromen." (Fredoka display), a one-line subtitle "Je leercompagnon voor rijtjes, vormen en regels." and a dark pill button "Aan de slag" plus a ghost link "Ik heb al een account".

### 6.13 Empty, loading and error states
- Empty: sleepy owl + one Dutch sentence + one primary button.
- Loading: skeleton cards in `surface-2` with a slow shimmer (disabled with reduced motion), never spinners alone.
- Error: oops owl, plain sentence, "Probeer opnieuw" button.

---

## 7. Copy and tone (Dutch)

**Terminology (stats and progress must work for every kind of content, not only rijtjes):**
- **onderdeel** = the unit that is counted and tracked: one row (a prompt with its answer(s)), whatever the template (vorm, woord, stijlfiguur, regel). Use it in every count: "12 van 20 onderdelen onder de knie", "24 onderdelen geoefend".
- **onder de knie** = mastered. A onderdeel is "onder de knie" once it was answered correctly without a hint at least twice in a row (`row_progress.streak >= 2`). A list or set is "onder de knie" when all its onderdelen are; percentages are always the share of onderdelen, never of lists.
- **rijtje** only names a list of the table template in the editor and set screens ("+ Rijtje", "Mijn rijtjes"). Do not use it for counts, stats or the leaderboard. Other templates get their own name later (e.g. "lijst").
- Never use "gekend".

Warm, short, encouraging, never scolding. Examples: "Goed bezig!", "Bijna! Probeer het nog eens.", "We gaan een stapje terug, geen zorgen.", "Je bent helemaal klaar met dit rijtje.", "Kleine stapjes, grote vooruitgang." Use "je/jij", no exclamation overload (max one per screen).

---

## 8. Motion, sound, feedback

- Durations 120–200ms for UI, 400ms for progress, easing `cubic-bezier(.2,.8,.2,1)`; button press 90ms.
- Correct answer: input turns sage, check icon pops (scale 0.8 → 1.1 → 1, 180ms). Wrong: 160ms wiggle, rose tint.
- Stage complete: sparkle burst around the stage indicator (8 particles, 600ms).
- Confetti only on test pass or full-rijtje mastery; 40 pieces, palette colors, 1.2s, gravity fall, then removed from DOM.
- Sounds (short, soft, default volume 40%, global mute in the top bar and settings): button click (wooden tick), correct (soft marimba pop), wrong (gentle low "bonk", never a buzzer), stage up (rising 3-note chime), test pass (4-note arpeggio), hint (tiny bell). Loaded as small static files or generated with WebAudio.
- `prefers-reduced-motion`: no wiggle, no confetti, no sparkle animation, no shimmer; keep color changes and static check icons.
- Optional later: ambient cozy music toggle (off by default).

---

## 9. Accessibility

- Contrast ≥ 4.5:1 for text on all tokens in both themes (check muted text especially).
- Never rely on color alone: correct/wrong also show an icon and `aria-live="polite"` status text.
- All inputs have labels (visually hidden when the prompt pill acts as label), visible focus ring, full keyboard operation of the practice grid, `autocapitalize="none"`, `autocomplete="off"`, `spellcheck="false"` on answer fields.
- Tap targets ≥ 44px on mobile. Respect safe-area insets for the tab bar.

---

## 10. Implementation notes

- Components live in `lib/components/ui` (Button, Card, ProgressBar, ProgressRing, Input, Chip, Toast, Modal, Toggle, Avatar, Owl) and `lib/components/practice` (AnswerGrid, HintBar, StageDots, ResultsCard).
- `Owl.svelte` takes `pose` (`idle | happy | thinking | cheer | sleepy | oops`) and `size` props, inline SVG using theme tokens.
- Chunky button is one reusable class set (`.btn` with variants via `data-variant`) in `layout.css`, using CSS variables for edge color so dark mode just works.
- Illustrations (hero scene, sunset cabin, window scene, bushes, butterflies, plant) are inline SVGs or small static SVG files; no photos, no uploads.
- Build order: tokens + Button/Card/Input first (PLAN phase 2), then shell + dashboard, then practice components in phase 4.