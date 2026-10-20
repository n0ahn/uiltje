// Per-session practice options that change which rows are asked or how strictly they are checked. Pure TS.
import type { StudySet } from '../schema/types';
import type { Rng } from './random';
import { shuffle } from './random';
import { flattenSources } from './stages';
import type { PracticeRow } from './types';

/**
 * 'set': every row keeps the strictness of its own set.
 * 'strict': accents and macrons must be right.
 * 'relaxed': accents and macrons may be left out.
 * Hoofdletters stay ignored in every mode (PLAN §7: always case-insensitive unless the set says otherwise).
 */
export type Strictness = 'set' | 'strict' | 'relaxed';

export function applyStrictness(rows: readonly PracticeRow[], strictness: Strictness): PracticeRow[] {
	if (strictness === 'set') return [...rows];
	const strict = strictness === 'strict';
	return rows.map((row) => ({ ...row, settings: { ...row.settings, strictAccents: strict, strictMacrons: strict } }));
}

/** Picks `count` random rows but keeps them in their original order (so lists stay together). null = all rows. */
export function limitRows(rows: readonly PracticeRow[], count: number | null, rng: Rng = Math.random): PracticeRow[] {
	if (count === null || count >= rows.length) return [...rows];
	if (count <= 0) return [];
	const keep = new Set(shuffle(rows, rng).slice(0, count).map((row) => row.key));
	return rows.filter((row) => keep.has(row.key));
}

/** Only the given rows, in their original order. */
export function onlyRows(rows: readonly PracticeRow[], keys: readonly string[]): PracticeRow[] {
	const wanted = new Set(keys);
	return rows.filter((row) => wanted.has(row.key));
}

/**
 * The rows of a practice session: the selected lists of the given sets (setId -> listIds), with the strictness
 * applied and, for a retry, only the given rows. Sets without a selection are left out.
 */
export function selectRows(
	sets: readonly StudySet[],
	selection: Readonly<Record<string, readonly string[]>>,
	options: { strictness: Strictness; onlyRowKeys: readonly string[] | null }
): PracticeRow[] {
	const chosen = sets.filter((set) => (selection[set.id]?.length ?? 0) > 0);
	const rows = applyStrictness(
		flattenSources(chosen.map((set) => ({ set, listIds: selection[set.id] ?? [] }))),
		options.strictness
	);
	return options.onlyRowKeys ? onlyRows(rows, options.onlyRowKeys) : rows;
}
