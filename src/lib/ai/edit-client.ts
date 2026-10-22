// Browser side of "Aanpassen met AI": calls POST /api/ai/edit with the compact request (see ai/edit.ts).
import type { EditRequest } from './edit';

export type EditOutcome = { ok: true; output: unknown } | { ok: false; message: string; aborted?: boolean };

export async function requestAiEdit(request: EditRequest, signal?: AbortSignal): Promise<EditOutcome> {
	let response: Response;
	try {
		response = await fetch('/api/ai/edit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal });
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return { ok: false, message: 'Geannuleerd.', aborted: true };
		return { ok: false, message: 'Geen verbinding. Controleer je internet en probeer het opnieuw.' };
	}
	let body: { ok?: boolean; message?: string; output?: unknown };
	try {
		body = (await response.json()) as typeof body;
	} catch {
		return { ok: false, message: response.status === 413 ? 'Dit is te veel in één keer. Kies alleen deze lijst.' : 'Er ging iets mis. Probeer het opnieuw.' };
	}
	if (!response.ok || !body.ok) return { ok: false, message: body.message ?? 'Er ging iets mis. Probeer het opnieuw.' };
	return { ok: true, output: body.output };
}
