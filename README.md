# Uiltje AI — Classical Languages & Vocabulary Learning Platform

An interactive, AI-powered web application for learning classical languages (Latin and Ancient Greek) and custom vocabulary. Built with SvelteKit, Supabase, and Google Gemini AI, it provides flashcard practice, AI-assisted explanations, grammar question banks, and social study features.

**Live Application:** [uiltje.vercel.app](https://uiltje.vercel.app) *(also accessible via [uiltje.now.sh](https://uiltje.now.sh))*

---

## Key Features

* **Practice Engines:**
  * **Vocabulary Flashcards:** Custom card runner supporting active recall, spaced learning, and instant grading.
  * **Grammar & Syntax:** Interactive exercises for declensions, conjugations, principal parts, and core sentence structure.
  * **AI Explanations:** Real-time AI hints, detailed answer breakdowns, and custom tips powered by Google Gemini.

* **Social & Gamification:**
  * **Study Challenges:** Challenge friends or complete full-set practice runs.
  * **Leaderboards & Streaks:** Track active daily streaks, progress, and activity stats across subject areas.
  * **Public & Shared Sets:** Share vocabulary lists via public links, user profiles, or invite codes.

* **Content Management & Editor:**
  * **Set Creation:** Full-featured study set editor with JSON import/export, paste parsing, and AI-assisted set generation/editing.
  * **Catalogues & Exam Support:** Built-in support for classical exam curricula (e.g., LTC 2027, GTC 2027).
  * **Guest Syncing:** Play without an account and import guest progress seamlessly upon authentication.

---

## Tech Stack

* **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5 runes & server-side routing)
* **Backend & Database:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Row-Level Security)
* **AI Engine:** Google Gemini AI API (`@google/genai`)
* **Styling:** Tailwind CSS / Custom CSS variables with dark & light theme support
* **Deployment:** [Vercel](https://vercel.com)
* **Validation:** Zod

---

## Project Structure

```text
├── src/
│   ├── lib/
│   │   ├── ai/            # Client-side AI utility helpers
│   │   ├── components/    # Svelte UI components (dashboard, practice, editor, grammar, social)
│   │   ├── engine/        # Core grading, grammar, Latin/Greek logic, and randomizers
│   │   ├── grammar/       # Curated catalogues, questions, and principal parts
│   │   ├── server/ai/     # Server-side Gemini API integration & prompt logic
│   │   ├── state/         # Svelte reactive state management (.svelte.ts)
│   │   ├── storage/       # Database adapters & local persistence
│   │   └── utils/         # Utility functions (speech, coverage, keyboard)
│   └── routes/            # SvelteKit pages, app shell, and API routes
├── ai/
│   └── sql/               # Supabase migration and database schema scripts
```

---

## Getting Started

### Prerequisites

* Node.js (v18+ recommended)
* npm, pnpm, or yarn
* Supabase project instance

### Environment Variables

Create a `.env` file in the root directory with the following keys:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### Installation & Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database schema:**
   Execute the SQL scripts located in `ai/sql/` inside your Supabase SQL editor to set up tables for user profiles, grammar questions, social connections, and challenges.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## Deployment

The application is deployed on Vercel and accessible at:
* **Primary URL:** [uiltje.vercel.app](https://uiltje.vercel.app)
* **Alias:** [uiltje.now.sh](https://uiltje.now.sh)