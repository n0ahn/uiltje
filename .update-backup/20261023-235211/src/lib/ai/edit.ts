// Client-side helpers for "Aanpassen met AI": build the compact request and turn the AI's answer into a checked list
// of changes the user can accept one by one. Pure TS: no Svelte, DOM or Supabase imports.
import { AiEditOutputSchema, MAX_EDIT_CHARS, MAX_EDIT_ROWS } from '../schema/ai-edit';
import type { EditListInput } from '../schema/ai-edit';
import type { DraftList } from '../editor/types';

export type EditChange =
	| { id: string; kind: 'edit'; listId: string; listTitle: string; rowId: string; before: { prompt: string; answers: string[] }; after: { prompt: string; answers: string[] }; reason: string }
	| { id: string; kind: 'add'; listId: string; listTitle: string; after: { prompt: string; answers: string[]; tags: Record<string, string> }; reason: string }
	| { id: string; kind: 'delete'; listId: string; listTitle: string; rowId: string; before: { prompt: string; answers: string[] }; reason: string };

export type EditRequest = { lists: EditListInput[]; instruction: string };
/** Maps the short refs used towards the AI back to real ids. */
export type RefMap = { lists: Map<string, string>; rows: Map<string, { listId: string; rowId: string }> };

const clean = (answers: string[]) => [...new Set(answers.map((a) => a.trim()).filter(Boolean))];

/** `null` list ids = all lists. Returns an error message (Dutch) when the selection is too large. */
export function buildEditRequest(lists: readonly DraftList[], instruction: string): { ok: true; request: EditRequest; refs: RefMap } | { ok: false; message: string } {
	const refs: RefMap = { lists: new Map(), rows: new Map() };
	let n = 0;
	const input: EditListInput[] = lists.map((list, i) => {
		const ref = `L${i + 1}`;
		refs.lists.set(ref, list.id);
		return {
			ref,
			title: list.title,
			kind: list.kind,
			columns: list.columns,
			dimensions: list.dimensions,
			rows: list.rows
				.filter((r) => r.prompt.trim() !== '' || r.answers.some((a) => a.trim() !== ''))
				.map((row) => {
					const rowRef = `r${++n}`;
					refs.rows.set(rowRef, { listId: list.id, rowId: row.id });
					return { ref: rowRef, prompt: row.prompt, answers: row.answers, tags: row.tags };
				})
		};
	});
	if (n === 0) return { ok: false, message: 'Er staan nog geen rijen in om aan te passen.' };
	if (n > MAX_EDIT_ROWS) return { ok: false, message: `Dit zijn te veel rijen in één keer (${n}, maximaal ${MAX_EDIT_ROWS}). Kies alleen deze lijst.` };
	const request = { lists: input, instruction: instruction.trim() };
	if (JSON.stringify(request).length > MAX_EDIT_CHARS) return { ok: false, message: 'Dit is te veel tekst in één keer. Kies alleen deze lijst.' };
	return { ok: true, request, refs };
}

export type EditPlan = { summary: string; changes: EditChange[]; dropped: number };

/** Validates the AI answer against the lists it was given. Anything pointing at unknown refs or changing nothing is dropped. */
export function resolveEditPlan(raw: unknown, lists: readonly DraftList[], refs: RefMap): EditPlan | null {
	const parsed = AiEditOutputSchema.safeParse(raw);
	if (!parsed.success) return null;
	const ai = parsed.data;
	const byId = new Map(lists.map((l) => [l.id, l] as const));
	const changes: EditChange[] = [];
	const touched = new Set<string>(); // one change per row
	let dropped = 0;
	let count = 0;
	const next = () => `c${++count}`;

	const find = (listRef: string, rowRef: string) => {
		const hit = refs.rows.get(rowRef.trim());
		const listId = refs.lists.get(listRef.trim());
		if (!hit || !listId || hit.listId !== listId) return null;
		const list = byId.get(listId);
		const row = list?.rows.find((r) => r.id === hit.rowId);
		return list && row ? { list, row } : null;
	};

	for (const e of ai.edits) {
		const found = find(e.list, e.row);
		const prompt = e.prompt.trim();
		const answers = clean(e.answers);
		if (!found || touched.has(found.row.id) || !prompt || answers.length === 0) {
			dropped++;
			continue;
		}
		const same = prompt === found.row.prompt.trim() && JSON.stringify(answers) === JSON.stringify(clean(found.row.answers));
		if (same) continue; // nothing changes, not worth showing
		touched.add(found.row.id);
		changes.push({ id: next(), kind: 'edit', listId: found.list.id, listTitle: found.list.title, rowId: found.row.id, before: { prompt: found.row.prompt, answers: found.row.answers }, after: { prompt, answers }, reason: e.reason.trim() });
	}
	for (const d of ai.deletions) {
		const found = find(d.list, d.row);
		if (!found || touched.has(found.row.id)) {
			dropped++;
			continue;
		}
		touched.add(found.row.id);
		changes.push({ id: next(), kind: 'delete', listId: found.list.id, listTitle: found.list.title, rowId: found.row.id, before: { prompt: found.row.prompt, answers: found.row.answers }, reason: d.reason.trim() });
	}
	const seenNew = new Set<string>();
	for (const a of ai.additions) {
		const listId = refs.lists.get(a.list.trim());
		const list = listId ? byId.get(listId) : undefined;
		const prompt = a.prompt.trim();
		const answers = clean(a.answers);
		const key = `${listId}\u0000${prompt.toLowerCase()}`;
		const exists = list?.rows.some((r) => r.prompt.trim().toLowerCase() === prompt.toLowerCase());
		if (!list || !prompt || answers.length === 0 || exists || seenNew.has(key)) {
			dropped++;
			continue;
		}
		seenNew.add(key);
		const tags: Record<string, string> = {};
		for (const { name, value } of a.tags) if (list.dimensions.includes(name.trim()) && value.trim()) tags[name.trim()] = value.trim();
		changes.push({ id: next(), kind: 'add', listId: list.id, listTitle: list.title, after: { prompt, answers, tags }, reason: a.reason.trim() });
	}
	return { summary: ai.summary.trim(), changes, dropped };
}
