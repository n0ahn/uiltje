// Per-user limit on AI imports, so one account cannot burn the shared free quota. Best effort: the counter lives in the
// memory of one server instance (serverless instances do not share it), which is enough to stop accidental hammering.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

/** Returns 0 when allowed (and counts the request), else the seconds until the user may try again. */
export function checkAiLimit(userId: string, now = Date.now()): number {
	const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
	if (recent.length >= MAX_PER_WINDOW) {
		hits.set(userId, recent);
		return Math.ceil((recent[0]! + WINDOW_MS - now) / 1000);
	}
	recent.push(now);
	hits.set(userId, recent);
	if (hits.size > 5000) for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
	return 0;
}
