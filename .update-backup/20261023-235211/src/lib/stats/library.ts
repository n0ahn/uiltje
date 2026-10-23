// Loads what the stats and the dashboard need: every set with its progress, plus the session log.
import type { StorageAdapter, SessionLog } from '../storage/adapter';
import type { LibrarySet } from './stats';

/** Streaks need history; a year back is plenty for the stats screens. */
export const HISTORY_DAYS = 365;

export type LoadedStats = { library: LibrarySet[]; sessions: SessionLog[] };

export async function loadStats(storage: StorageAdapter, now: number): Promise<LoadedStats> {
	const [summaries, sessions] = await Promise.all([storage.listSets(), storage.listSessions(now - HISTORY_DAYS * 86_400_000)]);
	const loaded = await Promise.all(
		summaries.map(async (s) => {
			const [set, progress] = await Promise.all([storage.getSet(s.id), storage.getProgress(s.id)]);
			return set ? { set, progress } : null;
		})
	);
	return { library: loaded.filter((x): x is LibrarySet => x !== null), sessions };
}
