// Mapping between app types and Supabase rows (pure, so it can be checked without a database).
// Everything that comes back from the database is validated here (RULES: zod at every boundary).
import { z } from 'zod';
import type { RowStats } from '../engine/types';
import type { StudySet } from '../schema/types';
import type { ProgressMap, SessionLog, SetSummary, TestRecord } from './adapter';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID_RE.test(value);

// ---- sets

export type SetRow = {
	id: string;
	title: string;
	subject: string;
	folder: string | null;
	data: StudySet;
	list_count: number;
	row_count: number;
};

export function toSetRow(set: StudySet): SetRow {
	return {
		id: set.id,
		title: set.title,
		subject: set.subject,
		folder: set.folder,
		data: set,
		list_count: set.lists.length,
		row_count: set.lists.reduce((sum, list) => sum + list.rows.length, 0)
	};
}

const SummaryRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	subject: z.string(),
	folder: z.string().nullable(),
	list_count: z.number(),
	row_count: z.number(),
	updated_at: z.string()
});

/** Skips rows that do not look right instead of failing the whole overview. */
export function toSetSummaries(rows: unknown[]): SetSummary[] {
	const out: SetSummary[] = [];
	for (const raw of rows) {
		const r = SummaryRowSchema.safeParse(raw);
		if (!r.success) continue;
		const v = r.data;
		out.push({
			id: v.id,
			title: v.title,
			subject: v.subject,
			folder: v.folder,
			listCount: v.list_count,
			rowCount: v.row_count,
			updatedAt: Date.parse(v.updated_at) || 0
		});
	}
	return out;
}

// ---- progress

export type ProgressRow = {
	set_id: string;
	list_id: string;
	row_id: string;
	correct: number;
	wrong: number;
	assisted: number;
	streak: number;
	last_seen: string;
};

const ProgressRowSchema = z.object({
	list_id: z.string(),
	row_id: z.string(),
	correct: z.number(),
	wrong: z.number(),
	assisted: z.number(),
	streak: z.number()
});

/** Key format of the engine: `${setId}/${listId}/${rowId}` (see rowKey in engine/stages.ts). */
export const progressKey = (setId: string, listId: string, rowId: string): string => `${setId}/${listId}/${rowId}`;

export function fromProgressRows(setId: string, rows: unknown[]): ProgressMap {
	const map: ProgressMap = {};
	for (const raw of rows) {
		const r = ProgressRowSchema.safeParse(raw);
		if (!r.success) continue;
		const { list_id, row_id, ...stats } = r.data;
		map[progressKey(setId, list_id, row_id)] = stats;
	}
	return map;
}

const int = (n: number): number => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));

/** Rows of `progress` that differ from `known` (everything when `known` is empty). Foreign keys are skipped. */
export function toProgressRows(setId: string, progress: ProgressMap, known: ProgressMap, now: Date): ProgressRow[] {
	const prefix = `${setId}/`;
	const out: ProgressRow[] = [];
	for (const [key, stats] of Object.entries(progress)) {
		if (!key.startsWith(prefix)) continue;
		const old = known[key];
		if (old && sameStats(old, stats)) continue;
		const rest = key.slice(prefix.length);
		const slash = rest.indexOf('/');
		if (slash <= 0 || slash === rest.length - 1) continue;
		out.push({
			set_id: setId,
			list_id: rest.slice(0, slash),
			row_id: rest.slice(slash + 1),
			correct: int(stats.correct),
			wrong: int(stats.wrong),
			assisted: int(stats.assisted),
			streak: int(stats.streak),
			last_seen: now.toISOString()
		});
	}
	return out;
}

function sameStats(a: RowStats, b: RowStats): boolean {
	return a.correct === b.correct && a.wrong === b.wrong && a.assisted === b.assisted && a.streak === b.streak;
}

// ---- test results (practice_sessions)

const WrongSchema = z.array(
	z.object({
		rowKey: z.string(),
		listTitle: z.string(),
		shown: z.string(),
		given: z.string(),
		expected: z.array(z.string())
	})
);

export type SessionRow = {
	id: string;
	mode: 'test';
	title: string;
	set_ids: string[];
	started_at: string;
	ended_at: string;
	total: number;
	correct: number;
	grade: number;
	passed: boolean;
	duration_seconds: number;
	timed_out: boolean;
	wrong: TestRecord['wrong'];
	/** ai/sql/009: absent columns are handled in `saveTestResult`. */
	test_kind: 'rijtjes' | 'woorden' | null;
	whole_set: boolean;
};

export function toSessionRow(record: TestRecord): SessionRow {
	const duration = int(record.durationSeconds);
	const total = int(record.total);
	return {
		id: record.id,
		mode: 'test',
		title: record.title,
		set_ids: record.setIds.filter(isUuid),
		started_at: new Date(record.takenAt - duration * 1000).toISOString(),
		ended_at: new Date(record.takenAt).toISOString(),
		total,
		correct: Math.min(int(record.correct), total),
		grade: Math.round(record.grade * 10) / 10,
		passed: record.passed,
		duration_seconds: duration,
		timed_out: record.timedOut,
		wrong: record.wrong,
		test_kind: record.kind ?? null,
		whole_set: record.wholeSet === true && record.kind !== undefined
	};
}

const SessionRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	set_ids: z.array(z.string()),
	ended_at: z.string(),
	total: z.number(),
	correct: z.number(),
	grade: z.coerce.number().nullable(),
	passed: z.boolean().nullable(),
	duration_seconds: z.number(),
	timed_out: z.boolean(),
	wrong: WrongSchema
});

export function fromSessionRows(rows: unknown[]): TestRecord[] {
	const out: TestRecord[] = [];
	for (const raw of rows) {
		const r = SessionRowSchema.safeParse(raw);
		if (!r.success) continue;
		const v = r.data;
		const takenAt = Date.parse(v.ended_at);
		if (Number.isNaN(takenAt)) continue;
		out.push({
			id: v.id,
			takenAt,
			title: v.title,
			setIds: v.set_ids,
			total: v.total,
			correct: v.correct,
			score: v.total > 0 ? v.correct / v.total : 0,
			grade: v.grade ?? 1,
			passed: v.passed ?? false,
			durationSeconds: v.duration_seconds,
			timedOut: v.timed_out,
			wrong: v.wrong
		});
	}
	return out;
}

// ---- session log (practice_sessions, both modes)

export type SessionLogRow = {
	id: string;
	mode: 'learn' | 'test';
	set_ids: string[];
	started_at: string;
	ended_at: string;
	total: number;
	correct: number;
	duration_seconds: number;
};

/** Only the columns of a log: for an existing test row the test details (title, grade, wrong forms) stay untouched. */
export function toSessionLogRow(log: SessionLog): SessionLogRow {
	const total = int(log.total);
	return {
		id: log.id,
		mode: log.mode,
		set_ids: log.setIds.filter(isUuid),
		started_at: new Date(log.startedAt).toISOString(),
		ended_at: new Date(log.endedAt).toISOString(),
		total,
		correct: Math.min(int(log.correct), total),
		duration_seconds: int((log.endedAt - log.startedAt) / 1000)
	};
}

const SessionLogRowSchema = z.object({
	id: z.string(),
	mode: z.enum(['learn', 'test']),
	set_ids: z.array(z.string()),
	started_at: z.string(),
	ended_at: z.string(),
	total: z.number(),
	correct: z.number()
});

export function fromSessionLogRows(rows: unknown[]): SessionLog[] {
	const out: SessionLog[] = [];
	for (const raw of rows) {
		const r = SessionLogRowSchema.safeParse(raw);
		if (!r.success) continue;
		const v = r.data;
		const startedAt = Date.parse(v.started_at);
		const endedAt = Date.parse(v.ended_at);
		if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) continue;
		out.push({ id: v.id, mode: v.mode, setIds: v.set_ids, startedAt, endedAt, total: v.total, correct: v.correct });
	}
	return out;
}
