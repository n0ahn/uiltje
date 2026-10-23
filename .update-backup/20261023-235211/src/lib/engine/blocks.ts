// Block practice (PLAN §6, phase 4). A *block* is one stage of one list with at most `maxBlockSize` forms
// (a declension has 10, a conjugation 6): the learner fills in the whole block, checks it, and only then moves on.
// Order: list by list; within a list the ladder from stages.ts (e.g. enkelvoud, meervoud, everything shuffled).
// Two ways: 'forward' (see the prompt "ev nom", type the form) and 'reverse' (see the form, type the prompt).
// Pure TS state machine, no UI.
import { isWordKind } from '../schema/types';
import { checkAnswer } from './checker';
import { buildHint } from './hints';
import type { Hint } from './hints';
import { shuffle } from './random';
import type { Rng } from './random';
import { toProgressDeltas } from './deltas';
import type { StepBack } from './deltas';
import { buildLadder } from './stages';
import type { PracticeRow, RowProgressDelta, RowStats, Stage } from './types';

export type { StepBack };
export type Direction = 'forward' | 'reverse' | 'both';
export type Way = 'forward' | 'reverse';
export type CellStatus = 'idle' | 'correct' | 'assisted' | 'wrong' | 'revealed';

export type Block = {
	id: string;
	listKey: string;
	listTitle: string;
	/** e.g. "Enkelvoud", "Alles samen". */
	label: string;
	way: Way;
	rowKeys: string[];
	/** Set when a stage with more than maxBlockSize rows is split. */
	part: { index: number; count: number } | null;
	/** Position of the stage in the list's ladder (0 = first stage). Tests have a single stage. */
	stageIndex: number;
	/** Set on blocks inserted by step-back: a repeat of the previous stage, or extra practice for hard rows. */
	review: 'stage' | 'row' | null;
};

export type BlockOptions = {
	direction: Direction;
	maxBlockSize?: number;
	rng?: Rng;
	/** One stage per list, no ladder: for practising only the mistakes, where a ladder would cut a handful of rows into 1-row blocks. */
	flat?: boolean;
};

const VALUE_LABELS: Record<string, string> = {
	sg: 'Enkelvoud',
	pl: 'Meervoud',
	nom: 'Nominativus',
	gen: 'Genitivus',
	dat: 'Dativus',
	acc: 'Accusativus',
	abl: 'Ablativus',
	pres: 'Praesens',
	impf: 'Imperfectum',
	perf: 'Perfectum',
	fut: 'Futurum'
};

function stageLabel(stage: Stage, onlyStage: boolean): string {
	if (stage.path.length === 0) return onlyStage ? 'Hele rijtje' : 'Alles samen';
	return stage.path.map((f) => VALUE_LABELS[f.value] ?? f.value).join(' · ');
}

/** Blocks for the given rows: list by list, each list through its own ladder. */
export function buildBlocks(rows: readonly PracticeRow[], options: BlockOptions): Block[] {
	const max = Math.max(1, options.maxBlockSize ?? 10);
	const rng = options.rng ?? Math.random;
	const ways: Way[] = options.direction === 'both' ? ['forward', 'reverse'] : [options.direction];

	const lists = new Map<string, PracticeRow[]>();
	for (const row of rows) {
		const key = `${row.setId}/${row.listId}`;
		const group = lists.get(key);
		if (group) group.push(row);
		else lists.set(key, [row]);
	}

	const blocks: Block[] = [];
	for (const [listKey, listRows] of lists) {
		const listTitle = listRows[0]?.listTitle ?? '';
		const ladder: Stage[] = options.flat ? [{ id: 'all', path: [], rowKeys: listRows.map((r) => r.key) }] : buildLadder(listRows);
		ladder.forEach((stage, stageIndex) => {
			const final = stage.path.length === 0;
			// Only the complete block is shuffled, so the table order is not learned by heart.
			// A vocab list has no stages but is shuffled as well: the order of a word list is not meaningful.
			const shuffleFinal = final && (ladder.length > 1 || options.flat === true || (listRows[0] ? isWordKind(listRows[0].listKind) : false));
			const label = options.flat ? 'Lastige vormen' : stageLabel(stage, ladder.length === 1);
			for (const way of ways) {
				const keys = shuffleFinal ? shuffle(stage.rowKeys, rng) : [...stage.rowKeys];
				const count = Math.ceil(keys.length / max);
				for (let part = 0; part < count; part++) {
					blocks.push({
						id: `${listKey}#${stageIndex}-${way}-${part}`,
						listKey,
						listTitle,
						label,
						way,
						rowKeys: keys.slice(part * max, (part + 1) * max),
						part: count > 1 ? { index: part + 1, count } : null,
						stageIndex,
						review: null
					});
				}
			}
		});
	}
	return blocks;
}

/**
 * Blocks for a test: every row is asked exactly once per way, no stages. List by list, shuffled within
 * the list, so the table order cannot be learned by heart. With direction 'both' a row is asked in both ways.
 */
export function buildTestBlocks(rows: readonly PracticeRow[], options: BlockOptions): Block[] {
	const max = Math.max(1, options.maxBlockSize ?? 10);
	const rng = options.rng ?? Math.random;
	const ways: Way[] = options.direction === 'both' ? ['forward', 'reverse'] : [options.direction];

	const lists = new Map<string, PracticeRow[]>();
	for (const row of rows) {
		const key = `${row.setId}/${row.listId}`;
		const group = lists.get(key);
		if (group) group.push(row);
		else lists.set(key, [row]);
	}

	const blocks: Block[] = [];
	for (const [listKey, listRows] of lists) {
		const listTitle = listRows[0]?.listTitle ?? '';
		for (const way of ways) {
			const keys = shuffle(
				listRows.map((r) => r.key),
				rng
			);
			const count = Math.ceil(keys.length / max);
			for (let part = 0; part < count; part++) {
				blocks.push({
					id: `${listKey}#test-${way}-${part}`,
					listKey,
					listTitle,
					label: 'Toets',
					way,
					rowKeys: keys.slice(part * max, (part + 1) * max),
					part: count > 1 ? { index: part + 1, count } : null,
					stageIndex: 0,
					review: null
				});
			}
		}
	}
	return blocks;
}

// ---------------------------------------------------------------- checking

function normalizeLabel(text: string): string {
	return text
		.normalize('NFC')
		.toLowerCase()
		.replace(/[.,;:]/gu, ' ')
		.replace(/\s+/gu, ' ')
		.trim();
}

/** Checks a prompt typed in the reverse direction; "gen ev" equals "ev gen". */
export function checkLabel(input: string, accepted: readonly string[]): boolean {
	const given = normalizeLabel(input);
	if (given === '') return false;
	const sorted = (s: string) => s.split(' ').sort().join(' ');
	return accepted.some((label) => {
		const norm = normalizeLabel(label);
		return norm === given || sorted(norm) === sorted(given);
	});
}

export type Cell = {
	rowKey: string;
	/** What the learner sees. */
	shown: string;
	way: Way;
	/** All accepted answers, the first is the primary one (used for hints and reveal). */
	accepted: string[];
};

// ---------------------------------------------------------------- results

export type TestItem = {
	blockIndex: number;
	rowKey: string;
	listTitle: string;
	way: Way;
	shown: string;
	given: string;
	expected: string[];
	correct: boolean;
};

export type TestResult = { total: number; correct: number; score: number; items: TestItem[]; wrong: TestItem[] };

export type CheckOutcome = { statuses: Record<string, CellStatus>; complete: boolean };

export type HintOutcome =
	| { kind: 'hint'; rowKey: string; hint: Hint }
	| { kind: 'revealed'; rowKey: string; answer: string }
	| { kind: 'ignored' };

export type BlockSessionOptions = BlockOptions & {
	rows: readonly PracticeRow[];
	mode: 'learn' | 'test';
	/** Learn mode only. Default 'stage'. */
	stepBack?: StepBack;
	/**
	 * 'stage': step back when the wrong answers in a block exceed this (default max(4, 75% of the block)).
	 * 'row': give a row extra practice when its wrong answers in a block exceed this (default 2).
	 */
	stepBackAfter?: number;
};

const RESOLVED: ReadonlySet<CellStatus> = new Set(['correct', 'assisted', 'revealed']);

export class BlockSession {
	readonly mode: 'learn' | 'test';

	#blocks: Block[];
	#rows = new Map<string, PracticeRow>();
	#lists = new Map<string, PracticeRow[]>();
	#index = 0;
	#finished: boolean;
	#status = new Map<string, CellStatus>();
	#last = new Map<string, string>();
	#hints = new Map<string, 1 | 2>();
	#stats = new Map<string, RowStats>();
	#given = new Map<string, string>();
	#result: TestResult | null = null;
	#stepBack: StepBack;
	#stepBackAfter: number | undefined;
	#blockWrong = 0;
	#rowWrong = new Map<string, number>();
	#everWrong = new Set<string>();
	#inserted = 0;
	#notice: string | null = null;

	constructor(options: BlockSessionOptions) {
		this.mode = options.mode;
		this.#stepBack = options.stepBack ?? 'stage';
		this.#stepBackAfter = options.stepBackAfter;
		for (const row of options.rows) {
			this.#rows.set(row.key, row);
			const key = `${row.setId}/${row.listId}`;
			const list = this.#lists.get(key);
			if (list) list.push(row);
			else this.#lists.set(key, [row]);
		}
		this.#blocks = options.mode === 'test' ? buildTestBlocks(options.rows, options) : buildBlocks(options.rows, options);
		this.#finished = this.#blocks.length === 0;
	}

	// ---- read state

	get finished(): boolean {
		return this.#finished;
	}
	get index(): number {
		return this.#index;
	}
	/** Grows in learn mode when step-back inserts review blocks. */
	get blockCount(): number {
		return this.#blocks.length;
	}
	get blocks(): readonly Block[] {
		return this.#blocks;
	}
	get block(): Block | null {
		return this.#finished ? null : (this.#blocks[this.#index] ?? null);
	}
	/** Message about the step-back that was just planned (shown with the next block), or null. */
	get notice(): string | null {
		return this.#notice;
	}
	/** Number of questions (cells) in all blocks. */
	get questionTotal(): number {
		return this.#blocks.reduce((n, b) => n + b.rowKeys.length, 0);
	}
	/** Questions in the blocks before the current one. */
	get questionsDone(): number {
		return this.#blocks.slice(0, this.#index).reduce((n, b) => n + b.rowKeys.length, 0);
	}
	/** Keys of the rows that were answered wrong (or revealed) at least once in this learn session. */
	wrongKeys(): string[] {
		return [...this.#everWrong];
	}

	/** Where a row comes from, for lists of mistakes. Does not give the answer away. */
	rowLabel(rowKey: string): { listTitle: string; prompt: string } | null {
		const row = this.#rows.get(rowKey);
		return row ? { listTitle: row.listTitle, prompt: row.prompt } : null;
	}

	/** The cells of the current block, in the order they are shown. */
	cells(): Cell[] {
		const block = this.block;
		return block ? block.rowKeys.map((key) => this.#cell(key, block.way)) : [];
	}
	status(rowKey: string): CellStatus {
		return this.#status.get(rowKey) ?? 'idle';
	}
	hintLevel(rowKey: string): 0 | 1 | 2 {
		return this.#hints.get(rowKey) ?? 0;
	}
	/** Every cell of the current block is correct, assisted or revealed. */
	get complete(): boolean {
		const block = this.block;
		return !!block && block.rowKeys.every((k) => RESOLVED.has(this.status(k)));
	}
	/** Number of empty cells of the current block (for the test confirmation). */
	blanks(inputs: Readonly<Record<string, string>>): number {
		return (this.block?.rowKeys ?? []).filter((k) => (inputs[k] ?? '').trim() === '').length;
	}

	// ---- learn mode

	/** Checks every unresolved, non-empty cell. Correct cells lock; wrong cells stay open for another try. */
	check(inputs: Readonly<Record<string, string>>): CheckOutcome {
		const block = this.block;
		if (this.mode !== 'learn' || !block) return { statuses: {}, complete: false };

		for (const key of block.rowKeys) {
			const current = this.status(key);
			if (RESOLVED.has(current)) continue;
			const input = inputs[key] ?? '';
			if (input.trim() === '') {
				if (current === 'wrong') this.#status.set(key, 'idle');
				continue;
			}
			if (current === 'wrong' && this.#last.get(key) === input) continue; // same wrong answer: not counted twice
			this.#last.set(key, input);

			const cell = this.#cell(key, block.way);
			const stats = this.#statsFor(key);
			if (this.#judge(cell, input, key)) {
				if (this.#hints.has(key)) {
					this.#status.set(key, 'assisted');
					stats.assisted++;
					stats.streak = 0;
				} else {
					this.#status.set(key, 'correct');
					stats.correct++;
					stats.streak++;
				}
			} else {
				this.#status.set(key, 'wrong');
				stats.wrong++;
				stats.streak = 0;
				this.#noteWrong(key);
			}
		}
		const statuses: Record<string, CellStatus> = {};
		for (const key of block.rowKeys) statuses[key] = this.status(key);
		return { statuses, complete: this.complete };
	}

	/** Hint 1: first letter. Hint 2: pattern. Hint 3: the answer, which counts as wrong. */
	hint(rowKey: string): HintOutcome {
		const block = this.block;
		if (this.mode !== 'learn' || !block || !block.rowKeys.includes(rowKey)) return { kind: 'ignored' };
		if (RESOLVED.has(this.status(rowKey))) return { kind: 'ignored' };

		const primary = this.#cell(rowKey, block.way).accepted[0] ?? '';
		const level = this.hintLevel(rowKey);
		if (level < 2) {
			const next = (level + 1) as 1 | 2;
			this.#hints.set(rowKey, next);
			return { kind: 'hint', rowKey, hint: buildHint(primary, next) };
		}
		this.#status.set(rowKey, 'revealed');
		const stats = this.#statsFor(rowKey);
		stats.wrong++;
		stats.streak = 0;
		this.#noteWrong(rowKey);
		return { kind: 'revealed', rowKey, answer: primary };
	}

	// ---- both modes

	/**
	 * Learn: moves to the next block once the current one is complete. If the block went badly, step-back
	 * inserts a review block first (see `notice`).
	 * Test: stores the answers of the current block (no feedback) and moves on.
	 * Returns true when the session is finished.
	 */
	advance(inputs: Readonly<Record<string, string>> = {}): boolean {
		const block = this.block;
		if (!block) return true;
		if (this.mode === 'learn') {
			if (!this.complete) return false;
			this.#planStepBack(block);
		} else {
			for (const key of block.rowKeys) this.#given.set(`${this.#index}:${key}`, inputs[key] ?? '');
		}
		this.#status.clear();
		this.#last.clear();
		this.#hints.clear();
		this.#index++;
		if (this.#index >= this.#blocks.length) {
			this.#finished = true;
			if (this.mode === 'test') this.finish();
		}
		return this.#finished;
	}

	// ---- test mode

	/** Time is up: stores the answers of the current block, everything not answered yet counts as wrong. */
	forceFinish(inputs: Readonly<Record<string, string>> = {}): TestResult | null {
		if (this.mode !== 'test') return null;
		if (this.#result) return this.#result;
		const block = this.block;
		if (block) for (const key of block.rowKeys) this.#given.set(`${this.#index}:${key}`, inputs[key] ?? '');
		this.#index = this.#blocks.length;
		this.#finished = true;
		return this.finish();
	}

	/** Grades everything. Empty cells count as wrong. Safe to call twice. */
	finish(): TestResult {
		if (this.#result) return this.#result;
		const items: TestItem[] = [];
		this.#blocks.forEach((block, blockIndex) => {
			for (const key of block.rowKeys) {
				const cell = this.#cell(key, block.way);
				const given = this.#given.get(`${blockIndex}:${key}`) ?? '';
				const correct = this.#judge(cell, given, key);
				items.push({ blockIndex, rowKey: key, listTitle: block.listTitle, way: block.way, shown: cell.shown, given, expected: cell.accepted, correct });
				const stats = this.#statsFor(key);
				if (correct) {
					stats.correct++;
					stats.streak++;
				} else {
					stats.wrong++;
					stats.streak = 0;
				}
			}
		});
		const correct = items.filter((i) => i.correct).length;
		this.#result = { total: items.length, correct, score: items.length === 0 ? 0 : correct / items.length, items, wrong: items.filter((i) => !i.correct) };
		return this.#result;
	}

	/** Per-row results since the last call (so progress can be saved block by block without double counting). */
	drainDeltas(): RowProgressDelta[] {
		const deltas = toProgressDeltas(this.#stats, this.#rows);
		this.#stats = new Map();
		return deltas;
	}

	// ---- internals

	#noteWrong(key: string): void {
		this.#blockWrong++;
		this.#rowWrong.set(key, (this.#rowWrong.get(key) ?? 0) + 1);
		this.#everWrong.add(key);
	}

	/**
	 * Called when a learn block is complete. 'stage': too many wrong answers in this block -> repeat the previous
	 * stage of the same list first. 'row': rows with too many wrong answers get an extra block of their own.
	 * Review blocks never trigger another step-back themselves. The first stage has nothing to step back to.
	 */
	#planStepBack(block: Block): void {
		this.#notice = null;
		const wrongTotal = this.#blockWrong;
		const rowWrong = this.#rowWrong;
		this.#blockWrong = 0;
		this.#rowWrong = new Map();
		if (block.review !== null || this.#stepBack === 'none') return;

		const inserts: Block[] = [];
		if (this.#stepBack === 'stage') {
			const limit = this.#stepBackAfter ?? Math.max(4, block.rowKeys.length * 0.75);
			if (wrongTotal > limit && block.stageIndex > 0) {
				const previous = this.#blocks.filter(
					(b) => b.review === null && b.listKey === block.listKey && b.way === block.way && b.stageIndex === block.stageIndex - 1
				);
				for (const b of previous) inserts.push({ ...b, id: `${b.id}~r${++this.#inserted}`, review: 'stage' });
				if (previous[0]) this.#notice = `Dit blok ging moeilijk. Eerst nog even terug naar "${previous[0].label}".`;
			}
		} else {
			const limit = this.#stepBackAfter ?? 2;
			const hard = block.rowKeys.filter((key) => (rowWrong.get(key) ?? 0) > limit);
			if (hard.length > 0) {
				inserts.push({
					id: `${block.id}~x${++this.#inserted}`,
					listKey: block.listKey,
					listTitle: block.listTitle,
					label: 'Extra oefening',
					way: block.way,
					rowKeys: hard,
					part: null,
					stageIndex: block.stageIndex,
					review: 'row'
				});
				this.#notice = `Extra oefening voor ${hard.length} lastige ${hard.length === 1 ? 'vorm' : 'vormen'}.`;
			}
		}
		if (inserts.length > 0) this.#blocks.splice(this.#index + 1, 0, ...inserts);
	}

	#statsFor(key: string): RowStats {
		let stats = this.#stats.get(key);
		if (!stats) {
			stats = { correct: 0, wrong: 0, assisted: 0, streak: 0 };
			this.#stats.set(key, stats);
		}
		return stats;
	}

	#cell(key: string, way: Way): Cell {
		const row = this.#rows.get(key) as PracticeRow;
		if (way === 'forward') return { rowKey: key, shown: row.prompt, way, accepted: [...row.answers] };
		// Reverse: the form is shown; every prompt of this list that has the same form is accepted (mensae = gen ev, dat ev, nom mv).
		const primary = row.answers[0] ?? '';
		const same = (this.#lists.get(`${row.setId}/${row.listId}`) ?? []).filter(
			(other) => other.key !== key && checkAnswer(primary, other.answers, other.settings).correct
		);
		return { rowKey: key, shown: primary, way, accepted: [...new Set([row.prompt, ...same.map((o) => o.prompt)])] };
	}

	#judge(cell: Cell, input: string, key: string): boolean {
		const row = this.#rows.get(key) as PracticeRow;
		return cell.way === 'forward' ? checkAnswer(input, row.answers, row.settings).correct : checkLabel(input, cell.accepted);
	}
}
