// Practice sessions (PLAN §6). Pure TS state machines, no UI. Two modes:
//  - LearnSession: stages, immediate feedback, hints, unlimited attempts, requeue, step back.
//  - TestSession: one input per row, no feedback until finish(), result with score and wrong answers.
// Both are keyed by row key, so a UI can drive them per row (prompt mode) or per grid cell (grid mode).
import { checkAnswer } from './checker';
import { buildHint } from './hints';
import type { Hint } from './hints';
import { mulberry32, randomInt, shuffle } from './random';
import type { Rng } from './random';
import { buildLadder } from './stages';
import type { PracticeRow, RowProgressDelta, RowStats, Stage } from './types';

export { mulberry32 };

// ---------------------------------------------------------------- shared

export type SessionMode = 'learn' | 'test';
export type StepBack = 'none' | 'row' | 'stage';

function emptyStats(): RowStats {
	return { correct: 0, wrong: 0, assisted: 0, streak: 0 };
}

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

function indexRows(rows: readonly PracticeRow[]): Map<string, PracticeRow> {
	return new Map(rows.map((r) => [r.key, r]));
}

// ---------------------------------------------------------------- learn mode

export type LearnOptions = {
	rows: readonly PracticeRow[];
	/** Defaults to buildLadder(rows). */
	ladder?: readonly Stage[];
	/** Unaided correct answers in a row needed per stage. Default 1. */
	streakTarget?: number;
	/** Default 'stage'. */
	stepBack?: StepBack;
	/**
	 * 'stage': step back when wrong answers in the current stage exceed this (default max(4, 75% of stage rows)).
	 * 'row': drill a row (one extra required correct answer) when its wrong answers in the stage exceed this (default 2).
	 */
	stepBackAfter?: number;
	/** A failed row comes back after this many other rows. Default 2..3. */
	requeueGap?: { min: number; max: number };
	rng?: Rng;
};

export type LearnEvent =
	| { type: 'none' }
	| { type: 'stage-up'; from: number; to: number }
	| { type: 'step-back'; from: number; to: number }
	| { type: 'row-drill'; rowKey: string }
	| { type: 'finished' };

export type SubmitOutcome =
	| { kind: 'ignored'; reason: 'finished' | 'unknown-row' | 'empty' }
	| {
			kind: 'judged';
			rowKey: string;
			correct: boolean;
			/** Correct, but a hint was used: does not count towards mastery. */
			assisted: boolean;
			/** The row is now mastered for this stage. */
			mastered: boolean;
			matched: string[];
			expected: readonly string[];
			event: LearnEvent;
	  };

export type HintOutcome =
	| { kind: 'ignored'; reason: 'finished' | 'unknown-row' }
	| { kind: 'hint'; rowKey: string; hint: Hint }
	| { kind: 'revealed'; rowKey: string; hint: Hint; expected: readonly string[]; event: LearnEvent };

export type LearnProgress = {
	stageIndex: number;
	stageCount: number;
	/** Rows mastered in the current stage. */
	mastered: number;
	/** Rows in the current stage. */
	total: number;
};

const NO_EVENT: LearnEvent = { type: 'none' };

export class LearnSession {
	readonly mode = 'learn' as const;

	#rows: Map<string, PracticeRow>;
	#ladder: Stage[];
	#streakTarget: number;
	#stepBack: StepBack;
	#stepBackAfter: number | undefined;
	#gap: { min: number; max: number };
	#rng: Rng;

	#stageIndex = 0;
	#stageSize = 0;
	#queue: string[] = [];
	#mastered = new Set<string>();
	#streak = new Map<string, number>();
	#required = new Map<string, number>();
	#rowWrong = new Map<string, number>();
	#stageWrong = 0;
	#hints = new Map<string, 1 | 2>();
	#stats = new Map<string, RowStats>();
	#finished = false;

	constructor(options: LearnOptions) {
		this.#rows = indexRows(options.rows);
		const ladder = options.ladder ?? buildLadder(options.rows);
		this.#ladder = ladder
			.map((s) => ({ ...s, rowKeys: s.rowKeys.filter((k) => this.#rows.has(k)) }))
			.filter((s) => s.rowKeys.length > 0);
		this.#streakTarget = Math.max(1, options.streakTarget ?? 1);
		this.#stepBack = options.stepBack ?? 'stage';
		this.#stepBackAfter = options.stepBackAfter;
		this.#gap = options.requeueGap ?? { min: 2, max: 3 };
		this.#rng = options.rng ?? Math.random;

		if (this.#ladder.length === 0) this.#finished = true;
		else this.#startStage();
	}

	// ---- read state

	get finished(): boolean {
		return this.#finished;
	}
	get stageIndex(): number {
		return this.#stageIndex;
	}
	get stageCount(): number {
		return this.#ladder.length;
	}
	get stage(): Stage | null {
		return this.#finished ? null : (this.#ladder[this.#stageIndex] ?? null);
	}
	/** Unmastered row keys of the current stage, in the order they will be asked. */
	get queue(): readonly string[] {
		return this.#queue;
	}
	get masteredKeys(): ReadonlySet<string> {
		return this.#mastered;
	}
	get stats(): ReadonlyMap<string, RowStats> {
		return this.#stats;
	}
	get progress(): LearnProgress {
		return {
			stageIndex: this.#stageIndex,
			stageCount: this.#ladder.length,
			mastered: this.#mastered.size,
			total: this.#stageSize
		};
	}

	row(key: string): PracticeRow | undefined {
		return this.#rows.get(key);
	}
	/** Next row to ask in prompt mode. */
	current(): PracticeRow | null {
		const key = this.#queue[0];
		return key === undefined ? null : (this.#rows.get(key) ?? null);
	}
	/** All rows of the current stage (for grid mode), in stage order. */
	stageRows(): PracticeRow[] {
		const stage = this.stage;
		if (!stage) return [];
		return stage.rowKeys.flatMap((k) => {
			const row = this.#rows.get(k);
			return row ? [row] : [];
		});
	}
	/** 0 = no hint used yet for this row. */
	hintLevel(key: string): 0 | 1 | 2 {
		return this.#hints.get(key) ?? 0;
	}
	progressDeltas(): RowProgressDelta[] {
		return toProgressDeltas(this.#stats, this.#rows);
	}

	// ---- actions

	submit(rowKey: string, input: string): SubmitOutcome {
		if (this.#finished) return { kind: 'ignored', reason: 'finished' };
		const row = this.#rows.get(rowKey);
		if (!row || !this.#queue.includes(rowKey)) return { kind: 'ignored', reason: 'unknown-row' };
		if (input.trim() === '') return { kind: 'ignored', reason: 'empty' };

		const { correct, matched } = checkAnswer(input, row.answers, row.settings);
		const stats = this.#statsFor(rowKey);
		const assisted = correct && this.hintLevel(rowKey) > 0;
		let mastered = false;
		let event: LearnEvent = NO_EVENT;

		if (!correct) {
			event = this.#registerFailure(rowKey);
		} else if (assisted) {
			stats.assisted++;
			stats.streak = 0;
			this.#streak.set(rowKey, 0);
			this.#hints.delete(rowKey);
			this.#requeue(rowKey);
		} else {
			stats.correct++;
			stats.streak++;
			const streak = (this.#streak.get(rowKey) ?? 0) + 1;
			this.#streak.set(rowKey, streak);
			if (streak >= (this.#required.get(rowKey) ?? this.#streakTarget)) {
				mastered = true;
				this.#mastered.add(rowKey);
				this.#queue = this.#queue.filter((k) => k !== rowKey);
				if (this.#queue.length === 0) event = this.#completeStage();
			} else {
				this.#requeue(rowKey);
			}
		}
		return { kind: 'judged', rowKey, correct, assisted, mastered, matched, expected: row.answers, event };
	}

	/** Next hint for a row. The third request reveals the answer, which counts as wrong. */
	hint(rowKey: string): HintOutcome {
		if (this.#finished) return { kind: 'ignored', reason: 'finished' };
		const row = this.#rows.get(rowKey);
		if (!row || !this.#queue.includes(rowKey)) return { kind: 'ignored', reason: 'unknown-row' };

		const primary = row.answers[0] ?? '';
		const next = this.hintLevel(rowKey) + 1;
		if (next === 1 || next === 2) {
			this.#hints.set(rowKey, next);
			return { kind: 'hint', rowKey, hint: buildHint(primary, next) };
		}
		this.#hints.delete(rowKey);
		const event = this.#registerFailure(rowKey);
		return { kind: 'revealed', rowKey, hint: buildHint(primary, 3), expected: row.answers, event };
	}

	// ---- internals

	#statsFor(key: string): RowStats {
		let stats = this.#stats.get(key);
		if (!stats) {
			stats = emptyStats();
			this.#stats.set(key, stats);
		}
		return stats;
	}

	#startStage(): void {
		const stage = this.#ladder[this.#stageIndex] as Stage;
		this.#mastered.clear();
		this.#streak.clear();
		this.#required.clear();
		this.#rowWrong.clear();
		this.#hints.clear();
		this.#stageWrong = 0;
		this.#stageSize = stage.rowKeys.length;
		// Only the "everything combined" stage is shuffled; earlier stages follow table order.
		this.#queue = stage.path.length === 0 ? shuffle(stage.rowKeys, this.#rng) : [...stage.rowKeys];
	}

	#requeue(key: string): void {
		this.#queue = this.#queue.filter((k) => k !== key);
		const at = Math.min(this.#queue.length, randomInt(this.#gap.min, this.#gap.max, this.#rng));
		this.#queue.splice(at, 0, key);
	}

	#completeStage(): LearnEvent {
		const from = this.#stageIndex;
		if (from + 1 >= this.#ladder.length) {
			this.#finished = true;
			return { type: 'finished' };
		}
		this.#stageIndex = from + 1;
		this.#startStage();
		return { type: 'stage-up', from, to: from + 1 };
	}

	/** Shared by wrong answers and revealed answers. */
	#registerFailure(key: string): LearnEvent {
		const stats = this.#statsFor(key);
		stats.wrong++;
		stats.streak = 0;
		this.#streak.set(key, 0);
		this.#stageWrong++;
		this.#rowWrong.set(key, (this.#rowWrong.get(key) ?? 0) + 1);
		this.#requeue(key);
		return this.#evaluateStepBack(key);
	}

	#evaluateStepBack(key: string): LearnEvent {
		if (this.#stepBack === 'none') return NO_EVENT;

		if (this.#stepBack === 'row') {
			const limit = this.#stepBackAfter ?? 2;
			if ((this.#rowWrong.get(key) ?? 0) <= limit) return NO_EVENT;
			this.#required.set(key, (this.#required.get(key) ?? this.#streakTarget) + 1);
			this.#rowWrong.set(key, 0);
			return { type: 'row-drill', rowKey: key };
		}

		const limit = this.#stepBackAfter ?? Math.max(4, Math.ceil(this.#stageSize * 0.75));
		if (this.#stageWrong <= limit) return NO_EVENT;
		if (this.#stageIndex === 0) {
			this.#stageWrong = 0; // nothing to step back to
			return NO_EVENT;
		}
		const from = this.#stageIndex;
		this.#stageIndex = from - 1;
		this.#startStage();
		return { type: 'step-back', from, to: from - 1 };
	}
}

// ---------------------------------------------------------------- test mode

export type TestOptions = {
	rows: readonly PracticeRow[];
	/** Shuffle row order. Default true. */
	shuffle?: boolean;
	rng?: Rng;
};

export type TestItem = {
	rowKey: string;
	prompt: string;
	given: string;
	expected: readonly string[];
	correct: boolean;
};

export type TestResult = {
	total: number;
	correct: number;
	/** correct / total, 0 when there are no rows. */
	score: number;
	items: TestItem[];
	wrong: TestItem[];
};

export class TestSession {
	readonly mode = 'test' as const;

	#order: PracticeRow[];
	#rows: Map<string, PracticeRow>;
	#given = new Map<string, string>();
	#result: TestResult | null = null;

	constructor(options: TestOptions) {
		this.#order =
			options.shuffle === false ? [...options.rows] : shuffle(options.rows, options.rng ?? Math.random);
		this.#rows = indexRows(this.#order);
	}

	get finished(): boolean {
		return this.#result !== null;
	}
	/** Rows in the order they are shown. */
	get rows(): readonly PracticeRow[] {
		return this.#order;
	}
	get answeredCount(): number {
		let n = 0;
		for (const v of this.#given.values()) if (v.trim() !== '') n++;
		return n;
	}
	given(rowKey: string): string {
		return this.#given.get(rowKey) ?? '';
	}

	/** Records (or overwrites) the input for a row. No feedback until finish(). */
	setAnswer(rowKey: string, input: string): boolean {
		if (this.#result || !this.#rows.has(rowKey)) return false;
		this.#given.set(rowKey, input);
		return true;
	}

	/** Grades everything. Unanswered rows count as wrong. Safe to call twice. */
	finish(): TestResult {
		if (this.#result) return this.#result;
		const items: TestItem[] = this.#order.map((row) => {
			const given = this.#given.get(row.key) ?? '';
			return {
				rowKey: row.key,
				prompt: row.prompt,
				given,
				expected: row.answers,
				correct: checkAnswer(given, row.answers, row.settings).correct
			};
		});
		const correct = items.filter((i) => i.correct).length;
		this.#result = {
			total: items.length,
			correct,
			score: items.length === 0 ? 0 : correct / items.length,
			items,
			wrong: items.filter((i) => !i.correct)
		};
		return this.#result;
	}

	progressDeltas(): RowProgressDelta[] {
		const result = this.finish();
		const stats = new Map<string, RowStats>(
			result.items.map((i) => [
				i.rowKey,
				{ correct: i.correct ? 1 : 0, wrong: i.correct ? 0 : 1, assisted: 0, streak: i.correct ? 1 : 0 }
			])
		);
		return toProgressDeltas(stats, this.#rows);
	}
}