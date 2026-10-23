// Browser side of the explanation check: POST /api/ai/explain. Never throws: a failed check just means "no AI verdict".
import type { Rating } from '../engine/explain';

export type GradeInput = { ref?: string; term: string; reference: string; answer: string };
export type GradeResult = { ok: true; results: { index: number; verdict: Rating; feedback: string }[] } | { ok: false; message: string };

export async function requestGrade(items: readonly GradeInput[], signal?: AbortSignal): Promise<GradeResult> {
	let response: Response;
	try {
		response = await fetch('/api/ai/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }), signal });
	} catch {
		return { ok: false, message: 'Geen verbinding om te laten nakijken.' };
	}
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return { ok: false, message: 'Het nakijken is mislukt.' };
	}
	const data = body as { ok?: boolean; message?: string; results?: unknown };
	if (!response.ok || !data.ok) return { ok: false, message: data.message ?? 'Het nakijken is mislukt.' };
	const results = Array.isArray(data.results)
		? (data.results as { index?: unknown; verdict?: unknown; feedback?: unknown }[]).flatMap((r) =>
				typeof r.index === 'number' && (r.verdict === 'goed' || r.verdict === 'bijna' || r.verdict === 'niet') ? [{ index: r.index, verdict: r.verdict as Rating, feedback: typeof r.feedback === 'string' ? r.feedback : '' }] : []
			)
		: [];
	return { ok: true, results };
}
