// "Uilenvangst" (minigame): owls drop out of a tree, every owl carries one answer, the learner catches the right one.
// Every term is one owl that has to be caught; a term that is missed comes back a few waves later, so the game ends
// when all owls are caught. Pure TS: no Svelte, DOM or Supabase imports.
import { shuffle, type Rng } from './random';
import type { ListKind } from '../schema/types';
import type { PracticeRow, RowProgressDelta, RowStats } from './types';

export type CatchDirection = 'forward' | 'reverse' | 'both';
export type CatchWay = 'forward' | 'reverse';
export type CatchSpeed = 'calm' | 'normal' | 'fast';

/** Longest text an owl can carry. Longer answers (definitions) are skipped: they do not fit on a tag. */
export const MAX_TAG_LENGTH = 32;
export const MIN_LANES = 2;
export const MAX_LANES = 5;
/** A missed owl comes back after this many other waves (or at the end when fewer are left). */
const REQUEUE_GAP = 3;
/** After this many misses the owl that has to be caught gets a hint (the UI makes its tag glow). */
export const HINT_AFTER_MISSES = 2;

export type CatchWave = {
	rowKey: string;
	way: CatchWay;
	/** Kind of the list the term comes from: the question is worded differently for words, begrippen and rijtjes. */
	kind: ListKind;
	/** Shown above the tree. */
	question: string;
	/** Small context above the question (the title of a rijtje, e.g. the word being declined). Empty for words and begrippen. */
	context: string;
	/** What every owl carries, left to right. */
	options: string[];
	correctIndex: number;
	/** 1 = first time this owl falls. */
	attempt: number;
	/** The right owl should be easy to see (it was missed twice already). */
	hint: boolean;
};

export type CatchJudgement = {
	caught: boolean;
	/** Nothing was chosen before the owls landed. */
	late: boolean;
	chosen: number | null;
	correctIndex: number;
	/** The right answer, as written on its tag. */
	expected: string;
	firstTry: boolean;
	/** Catches in a row, including this one (0 after a miss). */
	streak: number;
};

export type CatchSummary = {
	/** Owls in this game. */
	total: number;
	caught: number;
	/** Caught the first time they fell. */
	firstTry: number;
	/** Owls that were missed at least once. */
	missed: number;
	/** Waves played, including repeats. */
	waves: number;
	bestStreak: number;
};

export type CatchSessionOptions = {
	rows: readonly PracticeRow[];
	direction: CatchDirection;
	/** Owls per wave (answers to choose from), 2 to 5. */
	lanes: number;
	/** How many owls to catch (random pick), null = all. */
	count?: number | null;
	rng?: Rng;
};

type Item = { row: PracticeRow; way: CatchWay; tries: number; misses: number; done: boolean };
type Candidate = { text: string; row: PracticeRow };

const norm = (text: string) => text.normalize('NFC').trim().toLowerCase();
/** The text on an owl's tag: the first accepted answer (forward) or the term itself (reverse). */
export const tagFor = (row: PracticeRow, way: CatchWay): string => (way === 'forward' ? (row.answers[0] ?? '') : row.prompt).trim();
const questionFor = (row: PracticeRow, way: CatchWay): string => (way === 'forward' ? row.prompt : row.answers.join(', ')).trim();
const fits = (text: string) => text.length > 0 && text.length <= MAX_TAG_LENGTH;
const waysOf = (direction: CatchDirection): CatchWay[] => (direction === 'both' ? ['forward', 'reverse'] : [direction]);

/** How many rows can take part, and how many were left out because their text is too long for a tag. */
export function catchPool(rows: readonly PracticeRow[], direction: CatchDirection): { playable: number; tooLong: number } {
	const ways = waysOf(direction);
	let playable = 0;
	let tooLong = 0;
	for (const row of rows) {
		const ok = ways.every((way) => fits(tagFor(row, way)));
		if (ok) playable++;
		else tooLong++;
	}
	return { playable, tooLong };
}

/** Seconds an owl needs to fall, from the speed setting; a long question gets a little extra reading time. */
export function fallSeconds(speed: CatchSpeed, wave: Pick<CatchWave, 'question'>): number {
	const base: Record<CatchSpeed, number> = { calm: 14, normal: 10, fast: 7 };
	return base[speed] + Math.min(wave.question.length, 120) * 0.03;
}

/** 1 to 3 stars from the share of owls caught on the first try. A finished game is always worth one. */
export function starsFor(summary: Pick<CatchSummary, 'total' | 'firstTry'>): 1 | 2 | 3 {
	if (summary.total === 0) return 1;
	const share = summary.firstTry / summary.total;
	return share >= 0.9 ? 3 : share >= 0.7 ? 2 : 1;
}

export class CatchSession {
	readonly lanes: number;
	#rows = new Map<string, PracticeRow>();
	#queue: Item[] = [];
	#pools: Record<CatchWay, Candidate[]> = { forward: [], reverse: [] };
	#current: CatchWave | null = null;
	#judged: CatchJudgement | null = null;
	#rng: Rng;
	#stats = new Map<string, RowStats>();
	#unsent = new Set<string>();
	#wrong = new Set<string>();
	#summary: CatchSummary = { total: 0, caught: 0, firstTry: 0, missed: 0, waves: 0, bestStreak: 0 };
	#streak = 0;

	constructor(options: CatchSessionOptions) {
		this.#rng = options.rng ?? Math.random;
		this.lanes = Math.min(MAX_LANES, Math.max(MIN_LANES, Math.round(options.lanes)));
		const ways = waysOf(options.direction);
		const usable = options.rows.filter((row) => ways.every((way) => fits(tagFor(row, way))));
		for (const row of usable) this.#rows.set(row.key, row);
		for (const way of ways) this.#pools[way] = usable.map((row) => ({ text: tagFor(row, way), row }));

		let items: Item[] = usable.flatMap((row) => ways.map((way): Item => ({ row, way, tries: 0, misses: 0, done: false })));
		// An owl needs at least one other answer to hide among.
		items = items.filter((item) => this.#candidates(item).length > 0);
		items = shuffle(items, this.#rng);
		if (options.count != null && options.count > 0) items = items.slice(0, options.count);
		this.#queue = items;
		this.#summary.total = items.length;
	}

	get finished(): boolean {
		return this.#queue.length === 0;
	}
	get summary(): CatchSummary {
		return { ...this.#summary };
	}
	get streak(): number {
		return this.#streak;
	}
	/** Number of owls still to catch, the one that is falling included. */
	get remaining(): number {
		return this.#summary.total - this.#summary.caught;
	}

	/** The current wave; built the first time it is asked for, so a repeat gets new neighbours and a new order. */
	get wave(): CatchWave | null {
		const item = this.#queue[0];
		if (!item) return null;
		if (!this.#current) this.#current = this.#build(item);
		return this.#current;
	}

	/** Other answers that cannot be right for this question. */
	#candidates(item: Item): Candidate[] {
		const correct = norm(tagFor(item.row, item.way));
		const accepted = new Set(item.row.answers.map(norm));
		const seen = new Set<string>([correct]);
		const out: Candidate[] = [];
		for (const candidate of this.#pools[item.way]) {
			if (candidate.row.key === item.row.key) continue;
			const text = norm(candidate.text);
			if (seen.has(text)) continue;
			// Forward: another row's answer that this row also accepts would be right too.
			// Reverse: another term with the same meaning would be right too.
			if (item.way === 'forward' ? accepted.has(text) : candidate.row.answers.some((a) => accepted.has(norm(a)))) continue;
			seen.add(text);
			out.push(candidate);
		}
		return out;
	}

	#build(item: Item): CatchWave {
		const correct = tagFor(item.row, item.way);
		// Neighbours from the same list first: they look more like the right answer.
		const pool = shuffle(this.#candidates(item), this.#rng).sort((a, b) => Number(b.row.listId === item.row.listId) - Number(a.row.listId === item.row.listId));
		const decoys = pool.slice(0, this.lanes - 1).map((c) => c.text);
		const options = shuffle([correct, ...decoys], this.#rng);
		const context = item.row.listKind === 'vocab' || item.row.listKind === 'concept' ? '' : item.row.listTitle.trim();
		this.#summary.waves++;
		return {
			rowKey: item.row.key,
			way: item.way,
			kind: item.row.listKind,
			question: questionFor(item.row, item.way),
			context,
			options,
			correctIndex: options.indexOf(correct),
			attempt: item.tries + 1,
			hint: item.misses >= HINT_AFTER_MISSES
		};
	}

	/** The learner picked an owl (index), or the owls landed before anything was picked (null). One answer per wave. */
	answer(lane: number | null): CatchJudgement | null {
		const wave = this.wave;
		const item = this.#queue[0];
		if (!wave || !item || this.#judged) return null;
		if (lane !== null && (lane < 0 || lane >= wave.options.length)) return null;

		const caught = lane === wave.correctIndex;
		const firstTry = item.tries === 0;
		item.tries++;
		const prev = this.#stats.get(item.row.key) ?? { correct: 0, wrong: 0, assisted: 0, streak: 0 };

		if (caught) {
			item.done = true;
			this.#summary.caught++;
			this.#streak++;
			this.#summary.bestStreak = Math.max(this.#summary.bestStreak, this.#streak);
			if (firstTry) {
				this.#summary.firstTry++;
				this.#stats.set(item.row.key, { ...prev, correct: prev.correct + 1, streak: prev.streak + 1 });
			} else {
				// Caught after earlier misses: neutral, like a correct answer after a hint.
				this.#stats.set(item.row.key, { ...prev, assisted: prev.assisted + 1, streak: 0 });
			}
			this.#unsent.add(item.row.key);
		} else {
			item.misses++;
			this.#streak = 0;
			if (firstTry) {
				// Only the first fall counts as a mistake; repeating the same owl does not pile up more.
				this.#summary.missed++;
				this.#wrong.add(item.row.key);
				this.#stats.set(item.row.key, { ...prev, wrong: prev.wrong + 1, streak: 0 });
				this.#unsent.add(item.row.key);
			}
		}

		this.#judged = { caught, late: lane === null, chosen: lane, correctIndex: wave.correctIndex, expected: wave.options[wave.correctIndex] ?? '', firstTry, streak: this.#streak };
		return this.#judged;
	}

	/** On to the next wave. A missed owl is put back a few waves later. */
	next(): void {
		if (!this.#judged) return;
		const item = this.#queue.shift();
		if (item && !item.done) this.#queue.splice(Math.min(REQUEUE_GAP, this.#queue.length), 0, item);
		this.#current = null;
		this.#judged = null;
	}

	/** Progress to save since the last call. The caller adds it to the stored progress, so counters restart from zero. */
	drainDeltas(): RowProgressDelta[] {
		const out: RowProgressDelta[] = [];
		for (const key of this.#unsent) {
			const row = this.#rows.get(key);
			const stats = this.#stats.get(key);
			if (row && stats) out.push({ ...stats, rowKey: key, setId: row.setId, listId: row.listId, rowId: row.rowId });
		}
		this.#unsent.clear();
		for (const d of out) this.#stats.set(d.rowKey, { correct: 0, wrong: 0, assisted: 0, streak: 0 });
		return out;
	}

	/** Row keys of owls that were missed the first time they fell. */
	wrongKeys(): string[] {
		return [...this.#wrong];
	}
}
