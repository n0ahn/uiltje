// Client helpers for "Uitleg bij je fouten": build the request from the rows that went wrong and check the answer.
// Pure TS except `requestAiTips` (fetch). Nothing is saved here: the student reviews the tips first.
import { AiTipsOutputSchema, MAX_TIP_ITEMS, MAX_TIP_LENGTH } from '../schema/ai-tips';
import type { TipItem, TipRequest } from '../schema/ai-tips';

export type TipTarget = { key: string; list: string; kind: string; prompt: string; answers: string[]; given?: string };

/** At most MAX_TIP_ITEMS rows per request; the rest can be done with a second press. */
export function buildTipRequest(targets: readonly TipTarget[], meta: { subject: string; level: string }): { request: TipRequest; refs: Map<string, string> } {
	const refs = new Map<string, string>();
	const items: TipItem[] = targets.slice(0, MAX_TIP_ITEMS).map((t, i) => {
		const ref = `r${i + 1}`;
		refs.set(ref, t.key);
		return { ref, list: t.list, kind: t.kind, prompt: t.prompt, answers: t.answers, ...(t.given?.trim() ? { given: t.given.trim() } : {}) };
	});
	return { request: { subject: meta.subject, level: meta.level, items }, refs };
}

/** rowKey -> tip. Empty tips, unknown refs and double answers are dropped; long tips are cut at a word. */
export function resolveTips(raw: unknown, refs: ReadonlyMap<string, string>): Map<string, string> | null {
	const parsed = AiTipsOutputSchema.safeParse(raw);
	if (!parsed.success) return null;
	const out = new Map<string, string>();
	for (const { ref, tip } of parsed.data.tips) {
		const key = refs.get(ref.trim());
		let text = tip.replace(/\s+/g, ' ').trim();
		if (!key || !text || out.has(key)) continue;
		if (text.length > MAX_TIP_LENGTH) text = `${text.slice(0, MAX_TIP_LENGTH).replace(/\s+\S*$/, '')}…`;
		out.set(key, text);
	}
	return out;
}

export type TipsOutcome = { ok: true; output: unknown } | { ok: false; message: string; aborted?: boolean };

export async function requestAiTips(request: TipRequest, signal?: AbortSignal): Promise<TipsOutcome> {
	let response: Response;
	try {
		response = await fetch('/api/ai/tips', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal });
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return { ok: false, message: 'Geannuleerd.', aborted: true };
		return { ok: false, message: 'Geen verbinding. Controleer je internet en probeer het opnieuw.' };
	}
	let body: { ok?: boolean; message?: string; output?: unknown };
	try {
		body = (await response.json()) as typeof body;
	} catch {
		return { ok: false, message: 'Er ging iets mis. Probeer het opnieuw.' };
	}
	if (!response.ok || !body.ok) return { ok: false, message: body.message ?? 'Er ging iets mis. Probeer het opnieuw.' };
	return { ok: true, output: body.output };
}
