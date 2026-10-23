// Stage ladder (PLAN §6). Built from list dimensions + row tags; lists can be combined.
//
// Ladder for a list with dimensions [d1, d2, ...]: one stage per value of the first dimension that has
// 2+ distinct values (e.g. number: sg, pl), then the final stage with everything combined (shuffled by the session).
// `depth` > 1 also adds finer stages for the following dimensions, each before its parent stage.
// Lists with equal stage ids (same dimension=value) are merged into one stage, so "all declensions at once"
// practises all singulars first, then all plurals, then everything.
import type { PracticeRow, PracticeSource, Stage, StageFilter } from './types';

export function rowKey(setId: string, listId: string, rowId: string): string {
	return `${setId}/${listId}/${rowId}`;
}

export function flattenSources(sources: readonly PracticeSource[]): PracticeRow[] {
	const rows: PracticeRow[] = [];
	const seen = new Set<string>();
	for (const { set, listIds } of sources) {
		const wanted = listIds ? new Set(listIds) : null;
		for (const list of set.lists) {
			if (wanted && !wanted.has(list.id)) continue;
			for (const row of list.rows) {
				const key = rowKey(set.id, list.id, row.id);
				if (seen.has(key)) continue; // same list selected twice
				seen.add(key);
				rows.push({
					key,
					setId: set.id,
					listId: list.id,
					rowId: row.id,
					listTitle: list.title,
					listKind: list.kind,
					prompt: row.prompt,
					answers: row.answers,
					tags: row.tags,
					dimensions: list.dimensions,
					settings: set.settings,
					...(row.ref ? { ref: row.ref } : {})
				});
			}
		}
	}
	return rows;
}

type Draft = { id: string; path: StageFilter[]; keys: string[] };

function stageId(path: readonly StageFilter[]): string {
	return path.length === 0 ? 'all' : path.map((f) => `${f.dimension}=${f.value}`).join('&');
}

function collectStages(
	rows: readonly PracticeRow[],
	dims: readonly string[],
	depth: number,
	path: readonly StageFilter[],
	out: Draft[]
): void {
	if (depth <= 0) return;
	// Skip dimensions that do not split these rows.
	let i = 0;
	let values: string[] = [];
	for (; i < dims.length; i++) {
		const dim = dims[i] as string;
		values = [...new Set(rows.flatMap((r) => (r.tags[dim] !== undefined ? [r.tags[dim]] : [])))];
		if (values.length >= 2) break;
	}
	if (i >= dims.length) return;

	const dimension = dims[i] as string;
	for (const value of values) {
		const subset = rows.filter((r) => r.tags[dimension] === value);
		const subPath = [...path, { dimension, value }];
		collectStages(subset, dims.slice(i + 1), depth - 1, subPath, out);
		out.push({ id: stageId(subPath), path: subPath, keys: subset.map((r) => r.key) });
	}
}

export type LadderOptions = {
	/** How many dimensions deep to split. Default 1 (first splitting dimension only). */
	depth?: number;
};

export function buildLadder(rows: readonly PracticeRow[], options: LadderOptions = {}): Stage[] {
	if (rows.length === 0) return [];
	const depth = options.depth ?? 1;

	// Group per list (first-seen order) and generate each list's own stages.
	const byList = new Map<string, PracticeRow[]>();
	for (const row of rows) {
		const group = byList.get(`${row.setId}/${row.listId}`);
		if (group) group.push(row);
		else byList.set(`${row.setId}/${row.listId}`, [row]);
	}

	const merged = new Map<string, Draft>();
	for (const listRows of byList.values()) {
		const drafts: Draft[] = [];
		collectStages(listRows, listRows[0]?.dimensions ?? [], depth, [], drafts);
		for (const draft of drafts) {
			const existing = merged.get(draft.id);
			if (existing) {
				const have = new Set(existing.keys);
				for (const key of draft.keys) if (!have.has(key)) existing.keys.push(key);
			} else {
				merged.set(draft.id, { ...draft, keys: [...draft.keys] });
			}
		}
	}

	// Drop partial stages that cover everything or repeat the previous stage; then add the final stage.
	const total = rows.length;
	const stages: Stage[] = [];
	let previous = '';
	for (const draft of merged.values()) {
		const signature = [...draft.keys].sort().join('|');
		if (draft.keys.length === total || signature === previous) continue;
		previous = signature;
		stages.push({ id: draft.id, path: draft.path, rowKeys: draft.keys });
	}
	stages.push({ id: 'all', path: [], rowKeys: rows.map((r) => r.key) });
	return stages;
}