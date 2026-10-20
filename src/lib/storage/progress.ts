// Adds the results of a practice session to the saved progress (pure, so every adapter can reuse it).
import type { RowProgressDelta } from '../engine/types';
import type { ProgressMap } from './adapter';

export function applyDeltas(old: ProgressMap, deltas: readonly RowProgressDelta[]): ProgressMap {
	const next: ProgressMap = { ...old };
	for (const d of deltas) {
		const prev = next[d.rowKey] ?? { correct: 0, wrong: 0, assisted: 0, streak: 0 };
		// A session without mistakes or hints on this row extends the old streak; otherwise only its own run counts.
		const clean = d.wrong === 0 && d.assisted === 0;
		next[d.rowKey] = {
			correct: prev.correct + d.correct,
			wrong: prev.wrong + d.wrong,
			assisted: prev.assisted + d.assisted,
			streak: clean ? prev.streak + d.streak : d.streak
		};
	}
	return next;
}