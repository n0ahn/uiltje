// The five single-pass practice modes (PLAN §6): flashcards, multiple choice, dictation, spelling and hints.
// One session goes through every card once; wrong ones are not repeated (the result offers "only the mistakes").
// Pure TS: no Svelte, DOM or Supabase imports.
import { buildHint, type HintLevel } from './hints';
import { shuffle, type Rng } from './random';
import type { PracticeRow, RowProgressDelta, RowStats } from './types';
import { checkVocab, type VocabWay } from './vocab';

export const CARD_MODES = ['flashcards', 'choice', 'dictation', 'spelling', 'hints'] as const;
export type CardMode = (typeof CARD_MODES)[number];
export type CardDirection = 'forward' | 'reverse' | 'both';

/** `dictation` cards have no visible question: the word is read aloud and typed (the term itself). */
export type CardWay = VocabWay | 'dictation';

export type CardItem = {
	rowKey: string;
	way: CardWay;
	/** What is shown (empty for dictation). */
	shown: string;
	/** The answer as shown after the question: all accepted answers, or the term. */
	expected: string;
	/** Text to read aloud (dictation). */
	speak: string;
	/** Multiple choice. */
	options?: string[];
	correctIndex?: number;
};

export type CardJudgement = {
	correct: boolean;
	/** Right, but only after a hint. */
	assisted: boolean;
	/** The learner gave up or used the last hint: the answer is shown and counts as wrong. */
	revealed: boolean;
	expected: string;
	correctIndex?: number;
};

export type CardHintOutcome = { kind: 'hint'; text: string } | { kind: 'revealed'; judgement: CardJudgement } | { kind: 'ignored' };

export type CardSummary = { total: number; correct: number; wrong: number; assisted: number };

export type CardSessionOptions = {
	rows: readonly PracticeRow[];
	mode: CardMode;
	direction: CardDirection;
	rng?: Rng;
};

const CHOICE_COUNT = 4;
const MIN_CHOICES = 2;

const shownFor = (row: PracticeRow, way: VocabWay) => (way === 'forward' ? row.prompt : row.answers.join(', '));
const expectedFor = (row: PracticeRow, way: VocabWay) => (way === 'forward' ? row.answers.join(', ') : row.prompt);

/** Per-letter result of a typed answer, for the spelling mode: where does the input differ from the answer? */
export type LetterMark = { char: string; ok: boolean };
export function markLetters(given: string, expected: string): LetterMark[] {
	const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	const g = Array.from(seg.segment(given.normalize('NFC').trim()), (s) => s.segment);
	const e = Array.from(seg.segment(expected.normalize('NFC').trim()), (s) => s.segment);
	return e.map((char, i) => ({ char, ok: g[i] !== undefined && g[i]!.toLowerCase() === char.toLowerCase() }));
}

export class CardSession {
	readonly mode: CardMode;
	#rows = new Map<string, PracticeRow>();
	#items: CardItem[] = [];
	#index = 0;
	#judgement: CardJudgement | null = null;
	#hintLevel = 0;
	#stats = new Map<string, RowStats>();
	#unsent = new Set<string>();
	#summary: CardSummary = { total: 0, correct: 0, wrong: 0, assisted: 0 };
	#wrong = new Set<string>();

	constructor(options: CardSessionOptions) {
		const rng = options.rng ?? Math.random;
		this.mode = options.mode;
		for (const row of options.rows) this.#rows.set(row.key, row);
		const ways: VocabWay[] = options.direction === 'both' ? ['forward', 'reverse'] : [options.direction];
		const pairs = shuffle(
			options.rows.flatMap((row) => (options.mode === 'dictation' ? [{ row, way: 'dictation' as const }] : ways.map((way) => ({ row, way })))),
			rng
		);
		for (const { row, way } of pairs) {
			if (way === 'dictation') {
				this.#items.push({ rowKey: row.key, way, shown: '', expected: row.prompt, speak: row.prompt });
				continue;
			}
			const item: CardItem = { rowKey: row.key, way, shown: shownFor(row, way), expected: expectedFor(row, way), speak: '' };
			if (options.mode === 'choice') {
				const others = this.#distractors(row, way, options.rows, rng);
				if (others.length + 1 < MIN_CHOICES) continue; // not enough words to build a choice
				const choices = shuffle([item.expected, ...others], rng);
				item.options = choices;
				item.correctIndex = choices.indexOf(item.expected);
			}
			this.#items.push(item);
		}
	}

	#distractors(row: PracticeRow, way: VocabWay, rows: readonly PracticeRow[], rng: Rng): string[] {
		const correct = expectedFor(row, way);
		const seen = new Set([correct.toLowerCase()]);
		const out: string[] = [];
		// Words from the same list first: they look more alike than words from another list.
		const pool = shuffle(rows.filter((r) => r.key !== row.key), rng).sort((a, b) => Number(b.listId === row.listId) - Number(a.listId === row.listId));
		for (const other of pool) {
			const text = expectedFor(other, way);
			if (seen.has(text.toLowerCase())) continue;
			seen.add(text.toLowerCase());
			out.push(text);
			if (out.length === CHOICE_COUNT - 1) break;
		}
		return out;
	}

	get total(): number {
		return this.#items.length;
	}
	get index(): number {
		return this.#index;
	}
	get finished(): boolean {
		return this.#index >= this.#items.length;
	}
	get item(): CardItem | null {
		return this.#items[this.#index] ?? null;
	}
	get judgement(): CardJudgement | null {
		return this.#judgement;
	}
	get summary(): CardSummary {
		return { ...this.#summary };
	}

	#row(item: CardItem): PracticeRow {
		return this.#rows.get(item.rowKey) as PracticeRow;
	}

	#record(item: CardItem, j: CardJudgement): CardJudgement {
		this.#judgement = j;
		const prev = this.#stats.get(item.rowKey) ?? { correct: 0, wrong: 0, assisted: 0, streak: 0 };
		if (j.correct && !j.assisted) {
			this.#stats.set(item.rowKey, { ...prev, correct: prev.correct + 1, streak: prev.streak + 1 });
			this.#summary.correct++;
		} else if (j.correct) {
			this.#stats.set(item.rowKey, { ...prev, assisted: prev.assisted + 1, streak: 0 });
			this.#summary.assisted++;
		} else {
			this.#stats.set(item.rowKey, { ...prev, wrong: prev.wrong + 1, streak: 0 });
			this.#summary.wrong++;
			this.#wrong.add(item.rowKey);
		}
		this.#summary.total++;
		this.#unsent.add(item.rowKey);
		return j;
	}

	/** Answers the current card: an option index (multiple choice) or the typed text. null when nothing can be answered. */
	answer(input: string | number): CardJudgement | null {
		const item = this.item;
		if (!item || this.#judgement || this.mode === 'flashcards') return null;
		const row = this.#row(item);
		if (typeof input === 'number') {
			if (item.correctIndex === undefined) return null;
			return this.#record(item, { correct: input === item.correctIndex, assisted: false, revealed: false, expected: item.expected, correctIndex: item.correctIndex });
		}
		if (input.trim() === '') return null;
		// Spelling is about the exact letters, so accents always count there.
		const checked = this.mode === 'spelling' ? { ...row, settings: { ...row.settings, strictAccents: true } } : row;
		const way: VocabWay = item.way === 'dictation' ? 'reverse' : item.way;
		const correct = checkVocab(input, checked, way);
		return this.#record(item, { correct, assisted: correct && this.#hintLevel > 0, revealed: false, expected: item.expected });
	}

	/** Hint ladder (hints mode): first letter, then the pattern, then the answer (which counts as wrong). */
	hint(): CardHintOutcome {
		const item = this.item;
		if (!item || this.#judgement || this.mode !== 'hints') return { kind: 'ignored' };
		const target = (item.way === 'reverse' ? this.#row(item).prompt : this.#row(item).answers[0]) ?? item.expected;
		this.#hintLevel = Math.min(3, this.#hintLevel + 1);
		const hint = buildHint(target, this.#hintLevel as HintLevel);
		if (hint.reveals) return { kind: 'revealed', judgement: this.#record(item, { correct: false, assisted: false, revealed: true, expected: item.expected }) };
		return { kind: 'hint', text: hint.text };
	}

	giveUp(): CardJudgement | null {
		const item = this.item;
		if (!item || this.#judgement || this.mode === 'flashcards') return null;
		return this.#record(item, { correct: false, assisted: false, revealed: true, expected: item.expected, correctIndex: item.correctIndex });
	}

	/** Flashcards: the learner says whether they knew the card. Moves on at once. */
	rate(known: boolean): void {
		const item = this.item;
		if (!item || this.mode !== 'flashcards') return;
		this.#summary.total++;
		if (known) this.#summary.correct++;
		else {
			this.#summary.wrong++;
			this.#wrong.add(item.rowKey);
		}
		this.#advance();
	}

	next(): void {
		if (this.#judgement) this.#advance();
	}

	#advance(): void {
		this.#index++;
		this.#judgement = null;
		this.#hintLevel = 0;
	}

	/** Progress to save since the last call. Flashcards are self-rated, so they never change the progress. */
	drainDeltas(): RowProgressDelta[] {
		const out: RowProgressDelta[] = [];
		for (const key of this.#unsent) {
			const row = this.#rows.get(key);
			const stats = this.#stats.get(key);
			if (row && stats) out.push({ ...stats, rowKey: key, setId: row.setId, listId: row.listId, rowId: row.rowId });
		}
		this.#unsent.clear();
		// The caller adds every delta to the stored progress, so what was handed over starts again from zero
		// (a row can come back in the other direction).
		for (const d of out) this.#stats.set(d.rowKey, { correct: 0, wrong: 0, assisted: 0, streak: 0 });
		return out;
	}

	wrongKeys(): string[] {
		return [...this.#wrong];
	}
}
