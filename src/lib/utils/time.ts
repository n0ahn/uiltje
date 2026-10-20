/** `75` -> `1:15`. Used for the test timer and durations. */
export function formatClock(totalSeconds: number): string {
	const seconds = Math.max(0, Math.round(totalSeconds));
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
