// Adds AI-made lists to an existing set. Pure TS: no Svelte, DOM or Supabase imports.
// A new list goes in beside the old ones, unless an existing list has the same title and kind: then only the rows
// whose prompt is not there yet are appended (a row already in the set is skipped, never overwritten).
import type { StudyList, StudySet } from '../schema/types';

type Shape = { title: string; kind: string; rows: { prompt: string }[] };

export type MergeItem = {
	/** Index in the incoming lists. */
	index: number;
	/** Existing list that receives the rows, or null for a new list. */
	targetId: string | null;
	targetTitle: string | null;
	added: number;
	skipped: number;
};

const norm = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

function findTarget(lists: readonly StudyList[], incoming: Shape): StudyList | undefined {
	const title = norm(incoming.title);
	return title === '' ? undefined : lists.find((l) => l.kind === incoming.kind && norm(l.title) === title);
}

/** What would happen, per incoming list. Works on drafts too, so the review screen can show it live. */
export function planMerge(target: StudySet, incoming: readonly Shape[]): MergeItem[] {
	const claimed = new Map<string, Set<string>>(); // rows promised to an existing list, so two incoming lists cannot add the same row
	return incoming.map((list, index) => {
		const match = findTarget(target.lists, list);
		if (!match) return { index, targetId: null, targetTitle: null, added: list.rows.length, skipped: 0 };
		const seen = claimed.get(match.id) ?? new Set(match.rows.map((r) => norm(r.prompt)));
		claimed.set(match.id, seen);
		let added = 0;
		for (const row of list.rows) {
			const key = norm(row.prompt);
			if (seen.has(key)) continue;
			seen.add(key);
			added++;
		}
		return { index, targetId: match.id, targetTitle: match.title, added, skipped: list.rows.length - added };
	});
}

export function mergeIntoSet(target: StudySet, incoming: StudySet): { set: StudySet; added: number; skipped: number } {
	const lists = target.lists.map((l) => ({ ...l, rows: [...l.rows] }));
	let added = 0;
	let skipped = 0;
	for (const list of incoming.lists) {
		const match = findTarget(lists, list);
		if (!match) {
			lists.push({ ...list, rows: [...list.rows] });
			added += list.rows.length;
			continue;
		}
		const seen = new Set(match.rows.map((r) => norm(r.prompt)));
		for (const row of list.rows) {
			const key = norm(row.prompt);
			if (seen.has(key)) {
				skipped++;
				continue;
			}
			seen.add(key);
			match.rows.push(row);
			added++;
		}
	}
	return { set: { ...target, lists }, added, skipped };
}
