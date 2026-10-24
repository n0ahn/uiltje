// "Uilen-memory" (minigame): leaves lie face down, every pair is a term and its answer. Flip two: a pair stays open,
// a mismatch turns back. The game ends when all pairs are found. Pure TS: no Svelte, DOM or Supabase imports.
import { shuffle, type Rng } from './random';
import type { ListKind } from '../schema/types';
import type { PracticeRow, RowProgressDelta, RowStats } from './types';

/** Longest text a card can hold. Longer answers (definitions) are skipped: they do not fit on a leaf. */
export const MAX_CARD_LENGTH = 40;
export const MIN_PAIRS = 2;
export const MAX_PAIRS = 12;
/** A pair that was searched for in vain this many times is "lastig" (shown in the result, can be retried). */
export const TROUBLE_AFTER_MISSES = 2;

export type MemoryCard = {
	id: string;
	/** Row key: both cards of a pair share it. */
	pairId: string;
	side: 'prompt' | 'answer';
	text: string;
	/** Small context (title of a rijtje); empty for words and begrippen. */
	context: string;
	kind: ListKind;
};

export type MemoryFlip =
	/** First card of a try is open. */
	| { type: 'first'; card: string }
	| { type: 'match'; pairId: string; cards: [string, string]; firstTry: boolean }
	| { type: 'mismatch'; cards: [string, string] };

export type MemorySummary = {
	pairs: number;
	found: number;
	/** Tries (two cards flipped = one move). */
	moves: number;
	/** Pairs found without ever searching for them in vain. */
	firstTry: number;
	bestStreak: number;
};

export type MemorySessionOptions = {
	rows: readonly PracticeRow[];
	/** How many pairs (random pick), 2 to 12. */
	pairs: number;
	rng?: Rng;
};

const norm = (text: string) => text.normalize('NFC').trim().toLowerCase();
const fits = (text: string) => text.length > 0 && text.length <= MAX_CARD_LENGTH;
const answerOf = (row: PracticeRow) => (row.answers[0] ?? '').trim();
const contextOf = (row: PracticeRow) => (row.listKind === 'vocab' || row.listKind === 'concept' ? '' : row.listTitle.trim());
const keyOfPrompt = (row: PracticeRow) => norm(`${contextOf(row)}|${row.prompt}`);

/**
 * Rows that can become a pair: short enough, and no other row shows the same text (two identical leaves would make a
 * "wrong" pair look right). Returns the usable rows and how many were left out.
 */
export function memoryPool(rows: readonly PracticeRow[]): { usable: PracticeRow[]; skipped: number } {
	const prompts = new Set<string>();
	const answers = new Set<string>();
	const usable: PracticeRow[] = [];
	for (const row of rows) {
		const answer = answerOf(row);
		if (!fits(row.prompt.trim()) || !fits(answer)) continue;
		const p = keyOfPrompt(row);
		const a = norm(answer);
		if (prompts.has(p) || answers.has(a)) continue;
		prompts.add(p);
		answers.add(a);
		usable.push(row);
	}
	return { usable, skipped: rows.length - usable.length };
}

/** 1 to 3 stars from tries per pair: finding every pair in about 1.6 tries or less is 3 stars. A finished game is worth one. */
export function memoryStars(summary: Pick<MemorySummary, 'pairs' | 'moves'>): 1 | 2 | 3 {
	if (summary.pairs === 0 || summary.moves === 0) return 1;
	const efficiency = summary.pairs / summary.moves;
	return efficiency >= 0.6 ? 3 : efficiency >= 0.4 ? 2 : 1;
}

type Pair = { row: PracticeRow; misses: number; found: boolean };

export class MemorySession {
	readonly cards: readonly MemoryCard[];
	#pairs = new Map<string, Pair>();
	#open: string[] = [];
	#pendingMismatch: [string, string] | null = null;
	#found = new Set<string>();
	#byId = new Map<string, MemoryCard>();
	#stats = new Map<string, RowStats>();
	#unsent = new Set<string>();
	#summary: MemorySummary = { pairs: 0, found: 0, moves: 0, firstTry: 0, bestStreak: 0 };
	#streak = 0;

	constructor(options: MemorySessionOptions) {
		const rng = options.rng ?? Math.random;
		const pairs = Math.min(MAX_PAIRS, Math.max(MIN_PAIRS, Math.round(options.pairs)));
		const picked = shuffle(memoryPool(options.rows).usable, rng).slice(0, pairs);
		const cards: MemoryCard[] = [];
		for (const row of picked) {
			this.#pairs.set(row.key, { row, misses: 0, found: false });
			const context = contextOf(row);
			cards.push({ id: `${row.key}#p`, pairId: row.key, side: 'prompt', text: row.prompt.trim(), context, kind: row.listKind });
			cards.push({ id: `${row.key}#a`, pairId: row.key, side: 'answer', text: answerOf(row), context, kind: row.listKind });
		}
		this.cards = shuffle(cards, rng);
		for (const card of this.cards) this.#byId.set(card.id, card);
		this.#summary.pairs = picked.length;
	}

	get finished(): boolean {
		return this.#summary.pairs > 0 && this.#found.size === this.#summary.pairs;
	}
	get summary(): MemorySummary {
		return { ...this.#summary };
	}
	get streak(): number {
		return this.#streak;
	}
	/** Card ids that are face up and not yet part of a found pair (0, 1 or 2; 2 only right after a mismatch). */
	get open(): readonly string[] {
		return this.#pendingMismatch ?? this.#open;
	}
	isFound(cardId: string): boolean {
		const card = this.#byId.get(cardId);
		return !!card && this.#found.has(card.pairId);
	}
	/** A mismatch is on the table: it has to be turned back (`resolveMismatch`) before the next flip, which does it by itself. */
	get hasMismatch(): boolean {
		return this.#pendingMismatch !== null;
	}

	/** Turn the two cards of a mismatch face down again. */
	resolveMismatch(): void {
		this.#pendingMismatch = null;
	}

	/** Flip a card. Returns null when it cannot be flipped (found, already open, or unknown). */
	flip(cardId: string): MemoryFlip | null {
		const card = this.#byId.get(cardId);
		if (!card || this.finished || this.#found.has(card.pairId)) return null;
		if (this.#pendingMismatch) this.resolveMismatch();
		if (this.#open.includes(cardId)) return null;

		if (this.#open.length === 0) {
			this.#open = [cardId];
			return { type: 'first', card: cardId };
		}

		const firstId = this.#open[0] as string;
		const first = this.#byId.get(firstId) as MemoryCard;
		this.#open = [];
		this.#summary.moves++;

		if (first.pairId === card.pairId) {
			const pair = this.#pairs.get(card.pairId) as Pair;
			const firstTry = pair.misses === 0;
			pair.found = true;
			this.#found.add(pair.row.key);
			this.#summary.found++;
			this.#streak++;
			this.#summary.bestStreak = Math.max(this.#summary.bestStreak, this.#streak);
			const prev = this.#stats.get(pair.row.key) ?? { correct: 0, wrong: 0, assisted: 0, streak: 0 };
			if (firstTry) {
				this.#summary.firstTry++;
				this.#stats.set(pair.row.key, { ...prev, correct: prev.correct + 1, streak: prev.streak + 1 });
			} else {
				// Found after searching in vain: neutral, like a correct answer after a hint.
				this.#stats.set(pair.row.key, { ...prev, assisted: prev.assisted + 1, streak: 0 });
			}
			this.#unsent.add(pair.row.key);
			return { type: 'match', pairId: pair.row.key, cards: [firstId, cardId], firstTry };
		}

		// Flipping blindly is part of the game, so a mismatch is never a "wrong" answer. It only counts against the
		// pair of the FIRST card: that is the one the learner tried to find the partner of.
		this.#streak = 0;
		const searched = this.#pairs.get(first.pairId) as Pair;
		searched.misses++;
		this.#pendingMismatch = [firstId, cardId];
		return { type: 'mismatch', cards: [firstId, cardId] };
	}

	/** Progress to save since the last call. The caller adds it to the stored progress, so counters restart from zero. */
	drainDeltas(): RowProgressDelta[] {
		const out: RowProgressDelta[] = [];
		for (const key of this.#unsent) {
			const pair = this.#pairs.get(key);
			const stats = this.#stats.get(key);
			if (pair && stats) out.push({ ...stats, rowKey: key, setId: pair.row.setId, listId: pair.row.listId, rowId: pair.row.rowId });
		}
		this.#unsent.clear();
		for (const d of out) this.#stats.set(d.rowKey, { correct: 0, wrong: 0, assisted: 0, streak: 0 });
		return out;
	}

	/** Pairs that were searched for in vain at least `TROUBLE_AFTER_MISSES` times. */
	troubleKeys(): string[] {
		return [...this.#pairs.values()].filter((p) => p.misses >= TROUBLE_AFTER_MISSES).map((p) => p.row.key);
	}
}
