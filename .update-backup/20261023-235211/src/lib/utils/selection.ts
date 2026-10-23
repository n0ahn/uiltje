// "Oefen alleen deze termen": the set page stores the row keys the student picked, the practice route reads them and
// practises just those rows. Kept in sessionStorage (per tab, gone when the tab closes), because a long list of keys does
// not belong in a URL. Pure helpers plus a guarded storage access: it never throws.
import { rowKey } from '../engine/stages';
import type { StudySet } from '../schema/types';

const storageKey = (setId: string) => `uiltje:selection:${setId}`;

export function saveSelection(setId: string, rowKeys: readonly string[]): void {
	try {
		sessionStorage.setItem(storageKey(setId), JSON.stringify(rowKeys));
	} catch {
		/* storage blocked: the practice then simply covers the whole set */
	}
}

export function readSelection(setId: string): Set<string> | null {
	try {
		const raw = sessionStorage.getItem(storageKey(setId));
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		if (!Array.isArray(parsed)) return null;
		const keys = parsed.filter((k): k is string => typeof k === 'string');
		return keys.length > 0 ? new Set(keys) : null;
	} catch {
		return null;
	}
}

/** A copy of the set with only the picked rows (lists without picked rows are dropped). Ids stay as they are, so progress still lands on the right rows. */
export function onlyPicked(set: StudySet, keys: ReadonlySet<string>): StudySet {
	const lists = set.lists
		.map((list) => ({ ...list, rows: list.rows.filter((row) => keys.has(rowKey(set.id, list.id, row.id))) }))
		.filter((list) => list.rows.length > 0);
	return { ...set, lists };
}
