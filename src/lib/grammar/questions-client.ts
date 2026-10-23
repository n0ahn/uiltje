// Browser side of the question generation route (owner only): POST /api/ai/questions.
import type { Draft } from './questions-core';

export type Skipped = { ref: string; reason: string };
export type GenerateResult = { ok: true; drafts: Draft[]; skipped: Skipped[]; model: string; checked: boolean } | { ok: false; message: string; code: string };

export async function requestGenerate(refs: readonly string[], perItem: number, signal?: AbortSignal): Promise<GenerateResult> {
	let response: Response;
	try {
		response = await fetch('/api/ai/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refs, perItem }), signal });
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return { ok: false, message: 'Geannuleerd.', code: 'aborted' };
		return { ok: false, message: 'Geen verbinding. Controleer je internet en probeer het opnieuw.', code: 'network' };
	}
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return { ok: false, message: 'Er ging iets mis bij het maken van de vragen.', code: 'error' };
	}
	const data = body as { ok?: boolean; message?: string; code?: string; drafts?: unknown; skipped?: unknown; model?: unknown; checked?: unknown };
	if (!response.ok || !data.ok) return { ok: false, message: data.message ?? 'Er ging iets mis bij het maken van de vragen.', code: data.code ?? 'error' };
	const drafts = Array.isArray(data.drafts) ? (data.drafts as Draft[]).filter((d) => typeof d.ref === 'string' && typeof d.prompt === 'string' && (d.kind === 'sentence' || d.kind === 'paraphrase')) : [];
	const skipped = Array.isArray(data.skipped) ? (data.skipped as Skipped[]).filter((s) => typeof s.ref === 'string') : [];
	return { ok: true, drafts, skipped, model: typeof data.model === 'string' ? data.model : '', checked: data.checked === true };
}
