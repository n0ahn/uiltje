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
	/** Words/begrippen or rijtjes: one test is always one kind. Absent on tests from before challenges needed a whole-set test. */
	kind?: 'rijtjes' | 'woorden';
	/** The test asked every row of that kind of the set (no question limit, no picked terms, no lists left out). Only such a test counts for a challenge. */
	wholeSet?: boolean;
	wrong: { rowKey: string; listTitle: string; shown: string; given: string; expected: string[] }[];
};

/** One practice session (learn or test), kept for the streak and the stats page. */
export type SessionLog = {
	/** Same id on every save of the same run: a learn run saves after each block with growing totals. */
	id: string;
	mode: 'learn' | 'test';
	setIds: string[];
	/** ms since epoch */
	startedAt: number;
	endedAt: number;
	/** Answers given (learn: correct + wrong + after-hint; test: questions). */
	total: number;
	/** Answers that were correct without a hint. */
	correct: number;
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
	/** Upsert by id. Tests are logged through `saveTestResult`, so call this for learn runs only. */
	saveSession(log: SessionLog): Promise<void>;
	/** Learn runs and tests that ended at or after `sinceMs`, newest first. */
	listSessions(sinceMs: number): Promise<SessionLog[]>;
}

/** Thrown with a message that is safe to show to the user (Dutch). */
export class StorageError extends Error {}