// A copy of somebody else's set for your own library: same content, fresh ids everywhere, so the copy is independent
// (progress is keyed by set, list and row id). Pure TS.
import type { StudySet } from '../schema/types';

export function copyOfSet(set: StudySet, nextId: () => string): StudySet {
	return {
		...set,
		id: nextId(),
		lists: set.lists.map((list) => ({ ...list, id: nextId(), rows: list.rows.map((row) => ({ ...row, id: nextId() })) }))
	};
}
