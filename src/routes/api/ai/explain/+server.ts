// POST /api/ai/explain: checks the learner's own explanations against the syllabus (one request per run).
// Signed-in users only (shared free quota), with its own per-user limit.
import { json } from '@sveltejs/kit';
import { GEMINI_API_KEY, GEMINI_MODELS } from '$app/env/private';
import { AiError } from '#lib/server/ai/gemini.js';
import { ExplainRequestSchema, gradeExplanations } from '#lib/server/ai/explain.js';
import { DEFAULT_MODELS, parseModels } from '#lib/server/ai/import.js';
import { checkAiLimit } from '#lib/server/ai/limit.js';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

const fail = (status: number, code: string, message: string, headers?: HeadersInit) => json({ ok: false, code, message }, { status, headers });
const STATUS: Record<AiError['code'], number> = { not_configured: 503, rate_limited: 429, unavailable: 503, blocked: 422, bad_output: 502, too_long: 413 };

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return fail(401, 'unauthorized', 'Log in om je antwoorden door de AI te laten nakijken.');

	let body;
	try {
		const parsed = ExplainRequestSchema.safeParse(await request.json());
		if (!parsed.success) return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
		body = parsed.data;
	} catch {
		return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
	}

	const wait = checkAiLimit(`explain:${user.id}`);
	if (wait > 0) return fail(429, 'limit', `Even rustig aan: nakijken kan over ${Math.ceil(wait / 60)} min weer.`, { 'retry-after': String(wait) });

	try {
		const { results } = await gradeExplanations(body, { apiKey: GEMINI_API_KEY, models: parseModels(GEMINI_MODELS, DEFAULT_MODELS) });
		return json({ ok: true, results });
	} catch (error) {
		if (error instanceof AiError) return fail(STATUS[error.code], error.code, error.message);
		console.error('Explain check failed', error);
		return fail(500, 'error', 'Het nakijken is mislukt. Probeer het opnieuw.');
	}
};
