// Start of the leaderboard periods, in the browser's local time (Monday-based weeks, like the stats page).
export type Period = 'week' | 'month';

/** ms since epoch of the start of the current week (Monday 00:00) or month (the 1st, 00:00). */
export function periodStart(period: Period, now: number = Date.now()): number {
	const d = new Date(now);
	if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
	const sinceMonday = (d.getDay() + 6) % 7;
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
}

/** Share of answers that were right without a hint, or null when nothing was answered. */
export function accuracyOf(row: { practiced: number; correct: number }): number | null {
	return row.practiced === 0 ? null : row.correct / row.practiced;
}
