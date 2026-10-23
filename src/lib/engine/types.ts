// Shared engine types. Pure TS.
import type { ListKind, SetSettings, StudySet } from '../schema/types';

/** Which lists of which set take part in a practice session. Omit `listIds` for all lists. */
export type PracticeSource = {
	set: StudySet;
	listIds?: readonly string[];
};

/** One row flattened out of its set/list, carrying everything the engine needs. */
export type PracticeRow = {
	/** `${setId}/${listId}/${rowId}`: unique across combined sets, matches row_progress keys. */
	key: string;
	setId: string;
	listId: string;
	rowId: string;
	listTitle: string;
	/** Kind of the list the row belongs to (vocab lists are shuffled even when they have a single stage). */
	listKind: ListKind;
	prompt: string;
	answers: readonly string[];
	tags: Readonly<Record<string, string>>;
	/** The list's dimensions (stage progression order). */
	dimensions: readonly string[];
	/** Settings of the set this row came from (sets with different strictness can be mixed). */
	settings: SetSettings;
	/** Grammar catalogue reference of the row (`ltc-2027/anafora`), when it came from the catalogue. */
	ref?: string;
};

export type StageFilter = { dimension: string; value: string };

export type Stage = {
	/** Stable id, e.g. `number=sg`, `number=sg&case=nom`, or `all`. Lists with equal ids are merged. */
	id: string;
	/** Empty for the final "everything combined" stage. */
	path: readonly StageFilter[];
	rowKeys: readonly string[];
};

/** Per-row outcome counts of one session (input for saving row_progress). */
export type RowStats = {
	/** Correct without any hint. */
	correct: number;
	/** Wrong answers and revealed answers. */
	wrong: number;
	/** Correct, but only after a hint: neutral, counts as neither correct nor wrong. */
	assisted: number;
	/** Trailing run of unaided correct answers at the end of the session. */
	streak: number;
};

export type RowProgressDelta = RowStats & {
	rowKey: string;
	setId: string;
	listId: string;
	rowId: string;
};