// Shared bits of the practice engines: how a block session reacts to mistakes, and how session stats become stored progress.
import type { PracticeRow, RowProgressDelta, RowStats } from './types';

/** What happens when a block goes badly: nothing, extra practice for hard rows, or repeating the previous stage. */
export type StepBack = 'none' | 'row' | 'stage';

/** Converts session stats into per-row deltas ready for storage (row_progress). */
export function toProgressDeltas(
	stats: ReadonlyMap<string, RowStats>,
	rows: ReadonlyMap<string, PracticeRow>
): RowProgressDelta[] {
	const deltas: RowProgressDelta[] = [];
	for (const [rowKey, s] of stats) {
		const row = rows.get(rowKey);
		if (!row) continue;
		deltas.push({ ...s, rowKey, setId: row.setId, listId: row.listId, rowId: row.rowId });
	}
	return deltas;
}
