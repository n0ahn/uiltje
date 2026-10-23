// POST /api/ai/questions: the owner asks for new practice questions around syllabus items. Owner only (the free Gemini
// quota is small), and the questions come back as drafts: the owner's browser saves them and approves them one by one.
import { json } from '@sveltejs/kit';
import { GEMINI_API_KEY, GEMINI_MODELS } from '$app/env/private';
import { GenerateRequestSchema } from '#lib/grammar/questions-core.js';
import { AiError } from '#lib/server/ai/gemini.js';
import { DEFAULT_MODELS, parseModels } from '#lib/server/ai/import.js';
import { generateQuestions } from '#lib/server/ai/questions.js';
import type { RequestHandler } from './$types';

// Two Gemini calls (write, check) per request.
export const config = { maxDuration: 60 };

const fail = (status: number, code: string, message: string) => json({ ok: false, code, message }, { status });

const STATUS: Record<AiError['code'], number> = { not_configured: 503, rate_limited: 429, unavailable: 503, blocked: 422, bad_output: 502, too_long: 413 };

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return fail(401, 'unauthorized', 'Log in om dit te doen.');
	const { data: isAdmin } = await locals.supabase.rpc('is_app_admin');
	if (isAdmin !== true) return fail(403, 'forbidden', 'Dit mag alleen de beheerder.');

	let body;
	try {
		const parsed = GenerateRequestSchema.safeParse(await request.json());
		if (!parsed.success) return fail(400, 'invalid', 'Kies 1 tot 4 onderdelen en 1 tot 6 vragen per onderdeel.');
		body = parsed.data;
	} catch {
		return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
	}

	try {
		const outcome = await generateQuestions(body, { apiKey: GEMINI_API_KEY, models: parseModels(GEMINI_MODELS, DEFAULT_MODELS) });
		return json({ ok: true, ...outcome });
	} catch (error) {
		if (error instanceof AiError) return fail(STATUS[error.code], error.code, error.message);
		console.error('Question generation failed', error);
		return fail(500, 'error', 'Er ging iets mis bij het maken van de vragen. Probeer het opnieuw.');
	}
};
