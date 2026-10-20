// Storage seam (PLAN §5). Guests use localStorage (local.ts); a Supabase adapter follows in phase 5.
// Everything that reads or writes sets goes through this interface, never straight to a backend.
import type { RowStats } from '../engine/types';
import type { UserSettings } from '../settings/settings';
import type { StudySet } from '../schema/types';

/** Light version of a set for overviews and search (no need to load every row). */
export type SetSummary = {
	id: string;
	title: string;
	subject: string;
	folder: string | null;
	listCount: number;
	rowCount: number;
	/** ms since epoch */
	updatedAt: number;
};

/** Progress per row key (see rowKey in engine/stages.ts). */
export type ProgressMap = Record<string, RowStats>;

/** One finished test, kept so results can be shown later (and, in phase 6, counted for stats). */
export type TestRecord = {
	id: string;
	/** ms since epoch */
	takenAt: number;
	/** What was tested, e.g. the set title or the subject. */
	title: string;
	setIds: string[];
	total: number;
	correct: number;
	/** 0..1 */
	score: number;
	/** 1.0..10.0 */
	grade: number;
	passed: boolean;
	durationSeconds: number;
	/** The time limit ran out before the test was handed in. */
	timedOut: boolean;
	wrong: { rowKey: string; listTitle: string; shown: string; given: string; expected: string[] }[];
};

export interface StorageAdapter {
	listSets(): Promise<SetSummary[]>;
	/** null when the set does not exist (or is unreadable). */
	getSet(id: string): Promise<StudySet | null>;
	saveSet(set: StudySet): Promise<void>;
	deleteSet(id: string): Promise<void>;
	getProgress(setId: string): Promise<ProgressMap>;
	saveProgress(setId: string, progress: ProgressMap): Promise<void>;
	/** Defaults when nothing was saved yet. Always returns valid settings. */
	getSettings(): Promise<UserSettings>;
	saveSettings(settings: UserSettings): Promise<void>;
	saveTestResult(record: TestRecord): Promise<void>;
	/** Newest first. */
	listTestResults(limit?: number): Promise<TestRecord[]>;
}

/** Thrown with a message that is safe to show to the user (Dutch). */
export class StorageError extends Error {}