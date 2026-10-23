// POST /api/ai/tips: rows a student got wrong -> short explanations (never saved here). Signed-in users only; shares the
// per-user AI limit with the import. The Gemini key never leaves the server.
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { GEMINI_API_KEY, GEMINI_MODELS } from '$app/env/private';
import { MAX_TIP_ITEMS } from '#lib/schema/ai-tips.js';
import { AiError } from '#lib/server/ai/gemini.js';
import { DEFAULT_MODELS, parseModels } from '#lib/server/ai/import.js';
import { checkAiLimit } from '#lib/server/ai/limit.js';
import { checkTipRequest, runAiTips } from '#lib/server/ai/tips.js';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

const BodySchema = z.object({
	subject: z.string().max(60).default(''),
	level: z.string().max(20).default(''),
	items: z
		.array(z.object({ ref: z.string().max(12), list: z.string().max(200), kind: z.string().max(20), prompt: z.string().max(500), answers: z.array(z.string().max(500)).max(20), given: z.string().max(500).optional() }))
		.max(MAX_TIP_ITEMS)
});

const fail = (status: number, code: string, message: string, headers?: HeadersInit) => json({ ok: false, code, message }, { status, headers });

const STATUS: Record<AiError['code'], number> = { not_configured: 503, rate_limited: 429, unavailable: 503, blocked: 422, bad_output: 502, too_long: 413 };

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return fail(401, 'unauthorized', 'Log in om de AI te gebruiken.');

	let body: z.infer<typeof BodySchema>;
	try {
		const parsed = BodySchema.safeParse(await request.json());
		if (!parsed.success) return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
		body = parsed.data;
	} catch {
		return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
	}
	const problem = checkTipRequest(body);
	if (problem) return fail(400, 'invalid', problem);

	const wait = checkAiLimit(user.id);
	if (wait > 0) return fail(429, 'limit', `Even rustig aan: je kunt het over ${Math.ceil(wait / 60)} min opnieuw proberen.`, { 'retry-after': String(wait) });

	try {
		const { output } = await runAiTips(body, { apiKey: GEMINI_API_KEY, models: parseModels(GEMINI_MODELS, DEFAULT_MODELS) });
		return json({ ok: true, output });
	} catch (error) {
		if (error instanceof AiError) return fail(STATUS[error.code], error.code, error.message);
		console.error('AI tips failed', error);
		return fail(500, 'error', 'Er ging iets mis. Probeer het opnieuw.');
	}
};
