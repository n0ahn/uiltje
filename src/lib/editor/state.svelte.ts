// Working state of the set editor. All edits go through methods here so the components stay thin.
import { parseStudySet } from '../schema/migrate';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../schema/types';
import type { StudySet } from '../schema/types';
import { newId } from '../utils/id';
import { translateIssue } from './json';
import { createList, emptyRow, type TemplateId } from './templates';
import type { DraftList, DraftSet } from './types';

export type ToSetResult = { ok: true; set: StudySet } | { ok: false; issues: string[] };

export function emptyDraft(): DraftSet {
	return { id: newId(), title: '', subject: '', folder: '', settings: { ...DEFAULT_SETTINGS }, lists: [] };
}

const isBlank = (row: { prompt: string; answers: string[] }) => row.prompt.trim() === '' && row.answers.every((a) => a.trim() === '');

export class EditorState {
	set = $state<DraftSet>(emptyDraft());
	#saved = $state('');
	dirty = $derived(JSON.stringify(this.set) !== this.#saved);

	constructor(initial: DraftSet, saved = true) {
		this.set = initial;
		this.#saved = saved ? JSON.stringify(initial) : '';
	}

	markSaved(): void {
		this.#saved = JSON.stringify(this.set);
	}

	replace(next: DraftSet): void {
		this.set = next;
	}

	list(listId: string): DraftList | undefined {
		return this.set.lists.find((l) => l.id === listId);
	}

	addList(template: TemplateId): string {
		const list = createList(template);
		this.set.lists.push(list);
		return list.id;
	}

	removeList(listId: string): void {
		this.set.lists = this.set.lists.filter((l) => l.id !== listId);
	}

	addRow(listId: string, afterRowId?: string): string | null {
		const list = this.list(listId);
		if (!list) return null;
		const row = emptyRow();
		const index = afterRowId ? list.rows.findIndex((r) => r.id === afterRowId) : -1;
		list.rows.splice(index === -1 ? list.rows.length : index + 1, 0, row);
		return row.id;
	}

	removeRow(listId: string, rowId: string): void {
		const list = this.list(listId);
		if (list) list.rows = list.rows.filter((r) => r.id !== rowId);
	}

	moveRow(listId: string, rowId: string, toIndex: number): void {
		const list = this.list(listId);
		if (!list) return;
		const from = list.rows.findIndex((r) => r.id === rowId);
		if (from === -1) return;
		const to = Math.max(0, Math.min(list.rows.length - 1, toIndex));
		const [row] = list.rows.splice(from, 1);
		if (row) list.rows.splice(to, 0, row);
	}

	/** Rows from "Plak uit tekst". An untouched empty row at the end is replaced. */
	addPasted(listId: string, pasted: { prompt: string; answers: string[] }[]): void {
		const list = this.list(listId);
		if (!list) return;
		while (list.rows.length > 0 && isBlank(list.rows[list.rows.length - 1]!)) list.rows.pop();
		for (const { prompt, answers } of pasted) list.rows.push({ id: newId(), prompt, answers, tags: {} });
	}

	/** Returns an error message (Dutch) or null. */
	addDimension(listId: string, name: string): string | null {
		const list = this.list(listId);
		const clean = name.trim();
		if (!list) return null;
		if (clean === '') return 'Geef de dimensie een naam, bijvoorbeeld "naamval".';
		if (list.dimensions.includes(clean)) return `"${clean}" bestaat al in dit rijtje.`;
		list.dimensions.push(clean);
		return null;
	}

	/** Moves a dimension to another position; the order is the order of the practice stages. */
	moveDimension(listId: string, name: string, toIndex: number): void {
		const list = this.list(listId);
		if (!list) return;
		const from = list.dimensions.indexOf(name);
		if (from === -1) return;
		const to = Math.max(0, Math.min(list.dimensions.length - 1, toIndex));
		if (to === from) return;
		const [dimension] = list.dimensions.splice(from, 1);
		if (dimension !== undefined) list.dimensions.splice(to, 0, dimension);
	}

	removeDimension(listId: string, name: string): void {
		const list = this.list(listId);
		if (!list) return;
		list.dimensions = list.dimensions.filter((d) => d !== name);
		for (const row of list.rows) delete row.tags[name];
	}

	/** Returns an error message (Dutch) or null. */
	renameDimension(listId: string, from: string, to: string): string | null {
		const list = this.list(listId);
		const clean = to.trim();
		if (!list || clean === from) return null;
		if (clean === '') return 'De naam mag niet leeg zijn.';
		if (list.dimensions.includes(clean)) return `"${clean}" bestaat al in dit rijtje.`;
		list.dimensions = list.dimensions.map((d) => (d === from ? clean : d));
		for (const row of list.rows) {
			if (from in row.tags) {
				row.tags[clean] = row.tags[from]!;
				delete row.tags[from];
			}
		}
		return null;
	}

	/** Dutch problems that block saving (shown as a list). Empty array = valid. */
	validate(): string[] {
		const s = this.set;
		const issues: string[] = [];
		if (s.title.trim() === '') issues.push('Geef de set een titel.');
		if (s.subject.trim() === '') issues.push('Kies of typ een vak.');
		if (s.lists.length === 0) issues.push('Voeg minstens één rijtje toe.');
		s.lists.forEach((list, li) => {
			const label = list.title.trim() || `Rijtje ${li + 1}`;
			if (list.title.trim() === '') issues.push(`Rijtje ${li + 1} heeft nog geen titel.`);
			const rows = list.rows.filter((r) => !isBlank(r));
			if (rows.length === 0) issues.push(`${label} heeft nog geen rijen.`);
			rows.forEach((row, ri) => {
				if (row.prompt.trim() === '') issues.push(`${label}, rij ${ri + 1}: vul de ${list.columns.prompt.toLowerCase() || 'vraag'} in.`);
				else if (row.answers.every((a) => a.trim() === '')) issues.push(`${label}, "${row.prompt.trim()}": vul het antwoord in.`);
			});
		});
		return issues;
	}

	/** Cleans the working copy (trim, drop blank rows/variants/tags) and validates it with the strict schema. */
	toStudySet(): ToSetResult {
		const issues = this.validate();
		if (issues.length > 0) return { ok: false, issues };
		const s = this.set;
		const raw = {
			schemaVersion: SCHEMA_VERSION,
			id: s.id,
			title: s.title.trim(),
			subject: s.subject.trim(),
			folder: s.folder.trim() || null,
			settings: { ...s.settings },
			lists: s.lists.map((list) => ({
				id: list.id,
				template: list.template,
				kind: list.kind,
				title: list.title.trim(),
				group: list.group.trim() || null,
				columns: { prompt: list.columns.prompt.trim() || 'Vraag', answer: list.columns.answer.trim() || 'Antwoord' },
				dimensions: list.dimensions.map((d) => d.trim()).filter(Boolean),
				rows: list.rows
					.filter((r) => !isBlank(r))
					.map((row) => ({
						id: row.id,
						prompt: row.prompt.trim(),
						answers: row.answers.map((a) => a.trim()).filter(Boolean),
						tags: Object.fromEntries(
							Object.entries(row.tags)
								.map(([k, v]) => [k, v.trim()] as const)
								.filter(([k, v]) => v !== '' && list.dimensions.includes(k))
						)
					}))
			}))
		};
		const parsed = parseStudySet(raw);
		return parsed.ok ? parsed : { ok: false, issues: parsed.issues.map(translateIssue) };
	}
}