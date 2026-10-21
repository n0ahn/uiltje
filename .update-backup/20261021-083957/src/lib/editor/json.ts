// JSON import/export of a set, with Dutch error messages for people (the schema's own messages are English).
import { parseStudySet } from '../schema/migrate';
import type { StudySet } from '../schema/types';
import type { DraftSet } from './types';

const FIELDS: Record<string, string> = {
	title: 'titel',
	subject: 'vak',
	folder: 'map',
	settings: 'instellingen',
	lists: 'rijtjes',
	prompt: 'vraag',
	answers: 'antwoorden',
	tags: 'tags',
	columns: 'kolomnamen',
	dimensions: 'dimensies',
	rows: 'rijen',
	template: 'sjabloon',
	kind: 'soort',
	group: 'groep'
};

function translateMessage(message: string): string {
	if (/received undefined/.test(message)) return 'ontbreekt';
	if (/>=1|at least 1|Too small/i.test(message)) return 'mag niet leeg zijn';
	if (/expected (string|boolean|array|object)/.test(message)) return `heeft het verkeerde type (${message.replace(/^Invalid input: /, '')})`;
	if (/Invalid (option|input)/i.test(message)) return 'heeft geen geldige waarde';
	if (/must be unique/.test(message)) return 'id\'s van rijtjes en rijen moeten uniek zijn';
	return message;
}

/** "lists.0.rows.2.answers: Too small…" -> "Rijtje 1, rij 3, antwoorden: mag niet leeg zijn" */
export function translateIssue(issue: string): string {
	const split = issue.indexOf(': ');
	const path = split === -1 ? '' : issue.slice(0, split);
	const message = split === -1 ? issue : issue.slice(split + 2);
	if (!path || /\s/.test(path)) return translateMessage(issue);
	const parts = path.split('.');
	const out: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]!;
		const next = parts[i + 1];
		if (part === 'lists' && next !== undefined && /^\d+$/.test(next)) {
			out.push(`Rijtje ${Number(next) + 1}`);
			i++;
		} else if (part === 'rows' && next !== undefined && /^\d+$/.test(next)) {
			out.push(`rij ${Number(next) + 1}`);
			i++;
		} else if (part === 'answers' && next !== undefined && /^\d+$/.test(next)) {
			out.push(`antwoord ${Number(next) + 1}`);
			i++;
		} else {
			out.push(FIELDS[part] ?? part);
		}
	}
	return `${out.join(', ')}: ${translateMessage(message)}`;
}

export type ImportResult = { ok: true; set: StudySet } | { ok: false; issues: string[] };

export function importSetJson(text: string): ImportResult {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { ok: false, issues: ['Dit is geen geldige JSON. Controleer haakjes, komma\'s en aanhalingstekens.'] };
	}
	const result = parseStudySet(raw);
	if (result.ok) return result;
	return { ok: false, issues: result.issues.map(translateIssue) };
}

export function exportSetJson(set: StudySet): string {
	return JSON.stringify(set, null, 2);
}

/** StudySet -> editor working copy. */
export function toDraft(set: StudySet): DraftSet {
	return {
		id: set.id,
		title: set.title,
		subject: set.subject,
		folder: set.folder ?? '',
		settings: { ...set.settings },
		lists: set.lists.map((list) => ({ ...list, group: list.group ?? '', rows: list.rows.map((row) => ({ ...row, answers: [...row.answers], tags: { ...row.tags } })) }))
	};
}

/** Start a download of the set as a .json file (browser only). */
export function downloadSetJson(set: StudySet): void {
	const blob = new Blob([exportSetJson(set)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${set.title.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'set'}.json`;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}