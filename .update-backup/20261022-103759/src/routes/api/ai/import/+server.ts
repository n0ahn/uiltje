// POST /api/ai/import: photos and/or text -> StudySet draft. The Gemini key never leaves the server.
// Signed-in users only (the free quota is shared). Request body must stay under Vercel's 4.5 MB limit, so the browser
// shrinks photos first (lib/ai/images.ts) and this route enforces the same caps.
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { GEMINI_API_KEY, GEMINI_MODELS } from '$app/env/private';
import { AiError } from '#lib/server/ai/gemini.js';
import { DEFAULT_MODELS, parseModels, runAiImport } from '#lib/server/ai/import.js';
import { checkAiLimit } from '#lib/server/ai/limit.js';
import type { RequestHandler } from './$types';

// Reading a few photos can take a while; raise the function time on Vercel (ignored elsewhere).
export const config = { maxDuration: 60 };

const MAX_IMAGES = 5;
const MAX_IMAGE_CHARS = 1_400_000; // base64 length, about 1 MB of JPEG
const MAX_TOTAL_CHARS = 3_800_000;
const MAX_TEXT_CHARS = 40_000; // pasted text is capped at 20 000 in the UI; extracted DOCX text may be longer

const BodySchema = z.object({
	text: z.string().max(MAX_TEXT_CHARS).default(''),
	subject: z.string().max(60).default(''),
	note: z.string().max(500).default(''),
	images: z
		.array(z.object({ mime: z.enum(['image/jpeg', 'image/png', 'image/webp']), data: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).max(MAX_IMAGE_CHARS) }))
		.max(MAX_IMAGES)
		.default([]),
	documents: z
		.array(z.object({ mime: z.literal('application/pdf'), data: z.string().regex(/^JVBER[A-Za-z0-9+/]*={0,2}$/).max(MAX_TOTAL_CHARS) }))
		.max(1)
		.default([])
});

const fail = (status: number, code: string, message: string, headers?: HeadersInit) => json({ ok: false, code, message }, { status, headers });

const STATUS: Record<AiError['code'], number> = {
	not_configured: 503,
	rate_limited: 429,
	unavailable: 503,
	blocked: 422,
	bad_output: 502,
	too_long: 413
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return fail(401, 'unauthorized', 'Log in om de AI te gebruiken.');

	let body: z.infer<typeof BodySchema>;
	try {
		const parsed = BodySchema.safeParse(await request.json());
		if (!parsed.success) return fail(400, 'invalid', 'Dit verzoek is niet geldig. Controleer de foto\'s en de tekst.');
		body = parsed.data;
	} catch {
		return fail(400, 'invalid', 'Dit verzoek is niet geldig.');
	}
	if (body.text.trim() === '' && body.images.length === 0 && body.documents.length === 0) return fail(400, 'empty', 'Voeg een foto, document of tekst toe.');
	if ([...body.images, ...body.documents].reduce((sum, file) => sum + file.data.length, 0) > MAX_TOTAL_CHARS) return fail(413, 'too_big', 'De bestanden zijn samen te groot. Kies er minder, of kleinere.');

	const wait = checkAiLimit(user.id);
	if (wait > 0) return fail(429, 'limit', `Even rustig aan: je kunt het over ${Math.ceil(wait / 60)} min opnieuw proberen.`, { 'retry-after': String(wait) });

	try {
		const { result, model } = await runAiImport(body, { apiKey: GEMINI_API_KEY, models: parseModels(GEMINI_MODELS, DEFAULT_MODELS) });
		if (!result.ok) return fail(422, 'no_rows', result.issues[0] ?? 'Er is niets bruikbaars gevonden.');
		return json({ ok: true, set: result.set, notes: result.notes, model });
	} catch (error) {
		if (error instanceof AiError) return fail(STATUS[error.code], error.code, error.message);
		console.error('AI import failed', error);
		return fail(500, 'error', 'Er ging iets mis bij het lezen. Probeer het opnieuw.');
	}
};
