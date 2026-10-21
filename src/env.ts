import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true },
	PUBLIC_SUPABASE_ANON_KEY: { public: true },
	// Server only (`$app/env/private`). Optional: without a key the AI import answers "not configured" instead of breaking the build.
	GEMINI_API_KEY: { schema: (value) => value?.trim() || undefined, description: 'Google AI Studio API key for the AI import (phase 8). Never PUBLIC_.' },
	// Comma-separated, tried in order. Free-tier model names change often, so keep them here and not in code.
	GEMINI_MODELS: { schema: (value) => value?.trim() || undefined, description: 'Gemini models for the AI import, best first, e.g. "gemini-3.6-flash,gemini-3.1-flash-lite".' }
});
