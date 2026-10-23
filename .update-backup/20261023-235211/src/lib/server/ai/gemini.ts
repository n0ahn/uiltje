// Gemini transport (server only): one JSON-returning call with retry and model fallback.
// No SvelteKit imports, so it can be tested with a fake fetch. The key and model list are passed in.

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export type AiErrorCode = 'not_configured' | 'rate_limited' | 'unavailable' | 'blocked' | 'bad_output' | 'too_long';

export class AiError extends Error {
	constructor(
		readonly code: AiErrorCode,
		message: string
	) {
		super(message);
		this.name = 'AiError';
	}
}

export type GenerateOptions<T> = {
	apiKey: string | undefined;
	models: readonly string[];
	system: string;
	parts: GeminiPart[];
	/** JSON Schema for `responseJsonSchema`. */
	schema: unknown;
	/** Turns the parsed JSON into T, or throws. A throw counts as a bad answer (retried, then next model). */
	validate: (json: unknown) => T;
	fetchImpl?: typeof fetch;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
	/** Attempts per model for temporary errors. */
	attemptsPerModel?: number;
	/** Per request timeout. */
	requestTimeoutMs?: number;
	/** Whole call budget; stays under the function limit of the host. */
	totalBudgetMs?: number;
};

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

type Failure = 'rate_limited' | 'unavailable' | 'bad_output';

export async function generateJson<T>(options: GenerateOptions<T>): Promise<{ value: T; model: string }> {
	const { apiKey, models, system, parts, schema, validate } = options;
	const doFetch = options.fetchImpl ?? fetch;
	const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
	const now = options.now ?? Date.now;
	const attempts = options.attemptsPerModel ?? 2;
	const requestTimeout = options.requestTimeoutMs ?? 30_000;
	const budget = options.totalBudgetMs ?? 55_000;
	const started = now();

	if (!apiKey) throw new AiError('not_configured', 'De AI is nog niet beschikbaar.');
	if (models.length === 0) throw new AiError('not_configured', 'De AI is nog niet beschikbaar.');

	const failures: Failure[] = [];
	const body = JSON.stringify({
		systemInstruction: { parts: [{ text: system }] },
		contents: [{ role: 'user', parts }],
		generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.1, maxOutputTokens: 32768 }
	});

	for (const model of models) {
		for (let attempt = 0; attempt < attempts; attempt++) {
			if (now() - started > budget) throw summarize(failures);

			let response: Response;
			try {
				response = await doFetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
					body,
					signal: AbortSignal.timeout(requestTimeout)
				});
			} catch {
				failures.push('unavailable'); // network error or timeout
				if (attempt + 1 < attempts) await sleep(800 * 2 ** attempt);
				continue;
			}

			if (response.status === 401 || response.status === 403) throw new AiError('not_configured', 'De AI is nu niet beschikbaar.');
			if (response.status === 429) {
				failures.push('rate_limited'); // quota is per model: go straight to the next one
				break;
			}
			if (response.status === 404 || response.status === 400) {
				failures.push('unavailable'); // model retired, or it does not take this request: next model
				break;
			}
			if (!response.ok) {
				failures.push('unavailable'); // 500, 503, ...: temporary, retry once
				if (attempt + 1 < attempts) await sleep(800 * 2 ** attempt);
				continue;
			}

			let data: unknown;
			try {
				data = await response.json();
			} catch {
				failures.push('bad_output');
				continue;
			}
			const read = readCandidate(data);
			if (read.kind === 'blocked') throw new AiError('blocked', 'De AI wil deze inhoud niet verwerken. Probeer een andere foto of tekst.');
			if (read.kind === 'truncated') throw new AiError('too_long', 'Dit is te veel in één keer. Splits het in kleinere stukken.');
			if (read.kind === 'empty') {
				failures.push('bad_output');
				continue;
			}
			try {
				return { value: validate(JSON.parse(read.text)), model };
			} catch {
				failures.push('bad_output');
			}
		}
	}
	throw summarize(failures);
}

type Candidate = { kind: 'ok'; text: string } | { kind: 'blocked' } | { kind: 'truncated' } | { kind: 'empty' };

function readCandidate(data: unknown): Candidate {
	const root = data as { promptFeedback?: { blockReason?: string }; candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] } | null;
	if (root?.promptFeedback?.blockReason) return { kind: 'blocked' };
	const candidate = root?.candidates?.[0];
	if (!candidate) return { kind: 'empty' };
	if (candidate.finishReason === 'MAX_TOKENS') return { kind: 'truncated' };
	if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'PROHIBITED_CONTENT' || candidate.finishReason === 'RECITATION') return { kind: 'blocked' };
	const text = (candidate.content?.parts ?? []).map((p) => p.text ?? '').join('');
	return text.trim() ? { kind: 'ok', text } : { kind: 'empty' };
}

function summarize(failures: Failure[]): AiError {
	if (failures.length > 0 && failures.every((f) => f === 'rate_limited')) {
		return new AiError('rate_limited', 'De AI is even erg druk. Probeer het over een paar minuten opnieuw.');
	}
	if (failures.includes('bad_output') && !failures.includes('unavailable')) {
		return new AiError('bad_output', 'De AI gaf geen bruikbaar antwoord. Probeer het opnieuw, of met een scherpere foto.');
	}
	return new AiError('unavailable', 'De AI is nu even niet bereikbaar. Probeer het zo opnieuw.');
}
