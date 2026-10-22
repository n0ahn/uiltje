// Browser side of the AI import: calls POST /api/ai/import and validates what comes back (RULES: validate at every boundary).
import { parseStudySet } from '../schema/migrate';
import type { StudySet } from '../schema/types';
import type { PreparedImage } from './images';

export type AiImportInput = { text: string; images: PreparedImage[]; pdfs?: { data: string }[]; existing?: string[]; subject: string; note: string };
export type AiImportOutcome = { ok: true; set: StudySet; notes: string[] } | { ok: false; message: string; aborted?: boolean };

export async function requestAiImport(input: AiImportInput, signal?: AbortSignal): Promise<AiImportOutcome> {
	let response: Response;
	try {
		response = await fetch('/api/ai/import', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: input.text, subject: input.subject, note: input.note, images: input.images.map((i) => ({ mime: i.mime, data: i.data })), existing: input.existing ?? [], documents: (input.pdfs ?? []).map((d) => ({ mime: 'application/pdf', data: d.data })) }),
			signal
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return { ok: false, message: 'Geannuleerd.', aborted: true };
		return { ok: false, message: 'Geen verbinding. Controleer je internet en probeer het opnieuw.' };
	}

	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return { ok: false, message: response.status === 413 ? 'De bestanden zijn samen te groot. Kies er minder, of kleinere.' : 'Er ging iets mis bij het lezen. Probeer het opnieuw.' };
	}
	const data = body as { ok?: boolean; message?: string; set?: unknown; notes?: unknown };
	if (!response.ok || !data.ok) return { ok: false, message: data.message ?? 'Er ging iets mis bij het lezen. Probeer het opnieuw.' };

	const parsed = parseStudySet(data.set);
	if (!parsed.ok) return { ok: false, message: 'De AI gaf een set die niet klopt. Probeer het opnieuw.' };
	const notes = Array.isArray(data.notes) ? data.notes.filter((n): n is string => typeof n === 'string') : [];
	return { ok: true, set: parsed.set, notes };
}
