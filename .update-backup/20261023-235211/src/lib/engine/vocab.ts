// Vocabulary practice (phase 4b). Pure TS, no UI. Completely separate from the block practice of rijtjes:
// words are asked one at a time, in small rounds, like Quizlet Learn and StudyGo "Leren".
//
// Learn mode, per round of `roundSize` new words:
//   1. intro   - the new words are shown with their translation (no question yet).
//   2. choice  - multiple choice (recognise the translation). Skipped when the set has too few other words.
//   3. typed   - type the answer from memory. Hints available; "ik weet het niet" reveals the answer (counts as wrong).
//   4. typed again, after a few other questions (spacing). Two unaided typed answers = the word is learned.
// A wrong answer sends the word back to step 2 and it returns after 2 other questions. A word answered right only
// with a hint stays where it was. When every word of a round is learned the next round starts; at the end all words
// get one more typed question (eindronde). Words that are already "onder de knie" (saved streak) are skipped in the rounds.
//
// Test mode: every word once per way, typed, no feedback until finish().
import { checkAnswer } from './checker';
import { buildHint } from './hints';
import type { Hint } from './hints';
import { mulberry32, shuffle } from './random';
import type { Rng } from './random';
import { toProgressDeltas } from './deltas';
import type { PracticeRow, RowProgressDelta, RowStats } from './types';

export { mulberry32 };

export type VocabDirection = 'forward' | 'reverse' | 'both';
export type VocabWay = 'forward' | 'reverse';

/** Number of options in a multiple choice question, and how many other words are needed to build one. */
const CHOICE_COUNT = 4;

/** What the learner sees for a word in one way: the prompt (forward) or the translation(s) (reverse). */
function shownFor(row: PracticeRow, way: VocabWay): string {
	return way === 'forward' ? row.prompt : row.answers.join(', ');
}

/** What has to be typed: any of the translations (forward) or the word itself (reverse). */
function acceptedFor(row: PracticeRow, way: VocabWay): string[] {
	return way === 'forward' ? [...row.answers] : [row.prompt];
}

/** The answer as shown after a mistake. */
function expectedText(row: PracticeRow, way: VocabWay): string {
	return way === 'forward' ? row.answers.join(', ') : row.prompt;
}

/** Typed input is right when it matches one accepted answer; "a, b" or "a/b" with several translations also counts. */
export function checkVocab(input: string, row: PracticeRow, way: VocabWay): boolean {
	const accepted = acceptedFor(row, way);
	if (checkAnswer(input, accepted, row.settings).correct) return true;
	if (way === 'forward' && accepted.length > 1) {
		return checkAnswer(input.replace(/\s*,\s*/gu, '/'), accepted, row.settings).correct;
	}
	return false;
}

// ---------------------------------------------------------------- questions

export type IntroWord = { rowKey: string; prompt: string; answer: string };

export type VocabQuestion =
	| { step: 'intro'; round: number; words: IntroWord[] }
	| {
			step: 'choice';
			rowKey: string;
			way: VocabWay;
			shown: string;
			options: string[];
			correctIndex: number;
	  }
	| { step: 'typed'; rowKey: string; way: VocabWay; shown: string; accepted: string[] };

export type Judgement = {
	correct: boolean;
	/** Right, but only after a hint. */
	assisted: boolean;
	/** The learner gave up or used the last hint: the answer is shown and counts as wrong. */
	revealed: boolean;
	/** The answer to show (always filled, also when correct). */
	expected: string;
	/** Choice questions: which option was right. */
	correctIndex?: number;
};

export type VocabHintOutcome =
	| { kind: 'hint'; hint: Hint }
	| { kind: 'revealed'; judgement: Judgement }
	| { kind: 'ignored' };

export type VocabProgress = {
	/** Words learned in this session (plus words that were already known). */
	learned: number;
	total: number;
	/** 1-based round number; the final review is `roundCount` when `final` is true. */
	round: number;
	roundCount: number;
	final: boolean;
};

// ---------------------------------------------------------------- learn session

export type VocabLearnOptions = {
	rows: readonly PracticeRow[];
	direction: VocabDirection;
	/** New words per round. Default 5. */
	roundSize?: number;
	/** Row keys that are already known; they are left out of the rounds (but not of the final review). */
	knownKeys?: ReadonlySet<string>;
	rng?: Rng;
};

type Word = {
	row: PracticeRow;
	/** 0 new, 1 seen, 2 recognised (choice), 3 recalled once (typed), 4 learned (typed twice). */
	level: 0 | 1 | 2 | 3 | 4;
	/** Unaided typed answers so far; picks the way when direction is 'both'. */
	typedRight: number;
	dueAt: number;
	hintLevel: 0 | 1 | 2;
};

export class VocabSession {
	readonly mode = 'learn' as const;

	#words = new Map<string, Word>();
	#rows: PracticeRow[];
	#direction: VocabDirection;
	#rng: Rng;
	#rounds: string[][] = [];
	#roundIndex = -1;
	#final = false;
	#finalDone = false;
	#finalEnabled: boolean;
	#active: Word[] = [];
	#asked = 0;
	#lastKey: string | null = null;
	#question: VocabQuestion | null = null;
	#pending: Judgement | null = null;
	#finished = false;
	#stats = new Map<string, RowStats>();
	#wrongKeys = new Set<string>();
	#learned = new Set<string>();
	#known: number;

	constructor(options: VocabLearnOptions) {
		this.#rows = [...options.rows];
		this.#direction = options.direction;
		this.#rng = options.rng ?? Math.random;
		const roundSize = Math.max(1, options.roundSize ?? 5);
		for (const row of this.#rows) this.#words.set(row.key, { row, level: 0, typedRight: 0, dueAt: 0, hintLevel: 0 });

		let fresh = this.#rows.filter((r) => !(options.knownKeys?.has(r.key) ?? false));
		if (fresh.length === 0) fresh = [...this.#rows]; // everything known: practise it all anyway
		this.#known = this.#rows.length - fresh.length;
		for (let i = 0; i < fresh.length; i += roundSize) this.#rounds.push(fresh.slice(i, i + roundSize).map((r) => r.key));
		this.#finalEnabled = this.#rounds.length > 1;

		if (this.#rows.length === 0) this.#finished = true;
		else this.#advance();
	}

	// ---- read state

	get finished(): boolean {
		return this.#finished;
	}
	get question(): VocabQuestion | null {
		return this.#finished ? null : this.#question;
	}
	/** The judgement of the current question, until next() is called. */
	get judgement(): Judgement | null {
		return this.#pending;
	}
	get progress(): VocabProgress {
		const learned = this.#known + this.#learned.size;
		return {
			learned: Math.min(learned, this.#rows.length),
			total: this.#rows.length,
			round: Math.min(this.#roundIndex + 1, this.#rounds.length) + (this.#final ? 1 : 0),
			roundCount: this.#rounds.length + (this.#finalEnabled ? 1 : 0),
			final: this.#final
		};
	}
	/** Rows that went wrong at least once (for "only the mistakes"). */
	wrongKeys(): string[] {
		return [...this.#wrongKeys];
	}
	/** Labels for the side panel: the word as it was asked, never the answer. */
	rowLabel(key: string): string | null {
		return this.#words.get(key)?.row.prompt ?? null;
	}
	/** Retyping a missed answer: right when it matches (no stats, no judgement). */
	matchesAnswer(input: string): boolean {
		const q = this.#question;
		if (!q || q.step === 'intro') return false;
		const word = this.#words.get(q.rowKey);
		return !!word && checkVocab(input, word.row, q.way);
	}

	// ---- actions

	/** Leaves the intro screen. */
	continueIntro(): void {
		if (this.#question?.step !== 'intro') return;
		for (const w of this.#active) w.level = 1;
		this.#pickQuestion();
	}

	/** Answers the current question: an option index (choice) or the typed text. */
	answer(input: number | string): Judgement | null {
		const q = this.#question;
		if (this.#finished || !q || q.step === 'intro' || this.#pending) return null;
		const word = this.#words.get(q.rowKey);
		if (!word) return null;

		let correct: boolean;
		if (q.step === 'choice') correct = input === q.correctIndex;
		else {
			if (typeof input !== 'string' || input.trim() === '') return null;
			correct = checkVocab(input, word.row, q.way);
		}
		return this.#judge(word, q, correct, false);
	}

	hint(): VocabHintOutcome {
		const q = this.#question;
		if (this.#finished || !q || q.step !== 'typed' || this.#pending) return { kind: 'ignored' };
		const word = this.#words.get(q.rowKey);
		if (!word) return { kind: 'ignored' };
		const primary = q.accepted[0] ?? '';
		if (word.hintLevel < 2) {
			word.hintLevel = (word.hintLevel + 1) as 1 | 2;
			return { kind: 'hint', hint: buildHint(primary, word.hintLevel) };
		}
		return { kind: 'revealed', judgement: this.giveUp() as Judgement };
	}

	/** "Ik weet het niet": shows the answer and counts as wrong. */
	giveUp(): Judgement | null {
		const q = this.#question;
		if (this.#finished || !q || q.step === 'intro' || this.#pending) return null;
		const word = this.#words.get(q.rowKey);
		return word ? this.#judge(word, q, false, true) : null;
	}

	/** Moves on after the judgement has been shown. */
	next(): void {
		if (this.#finished) return;
		if (this.#question?.step === 'intro') return this.continueIntro();
		this.#pending = null;
		this.#pickQuestion();
	}

	/** Results since the last call, so progress can be saved without double counting. */
	drainDeltas(): RowProgressDelta[] {
		const deltas = toProgressDeltas(this.#stats, new Map(this.#rows.map((r) => [r.key, r])));
		this.#stats = new Map();
		return deltas;
	}

	// ---- internals

	#statsFor(key: string): RowStats {
		let stats = this.#stats.get(key);
		if (!stats) {
			stats = { correct: 0, wrong: 0, assisted: 0, streak: 0 };
			this.#stats.set(key, stats);
		}
		return stats;
	}

	#wayFor(word: Word): VocabWay {
		if (this.#direction !== 'both') return this.#direction;
		return word.typedRight % 2 === 0 ? 'forward' : 'reverse';
	}

	/** Other words' texts to use as wrong options; null when there are not enough distinct ones. */
	#distractors(word: Word, way: VocabWay): string[] | null {
		const correct = expectedText(word.row, way);
		const pool = new Set<string>();
		for (const w of this.#words.values()) {
			if (w === word) continue;
			const text = expectedText(w.row, way);
			if (text !== correct) pool.add(text);
		}
		return pool.size >= CHOICE_COUNT - 1 ? shuffle([...pool], this.#rng).slice(0, CHOICE_COUNT - 1) : null;
	}

	#judge(word: Word, q: Exclude<VocabQuestion, { step: 'intro' }>, correct: boolean, revealed: boolean): Judgement {
		const stats = this.#statsFor(word.row.key);
		const assisted = correct && word.hintLevel > 0;
		this.#asked++;
		this.#lastKey = word.row.key;

		if (correct && !assisted) {
			if (q.step === 'choice') {
				word.level = Math.max(word.level, 2) as Word['level'];
				word.dueAt = this.#asked + 1;
			} else {
				word.typedRight++;
				word.level = (word.level >= 3 ? 4 : 3) as Word['level'];
				if (word.level === 4) this.#learned.add(word.row.key);
				word.dueAt = this.#asked + 3;
				stats.correct++;
				stats.streak++;
			}
		} else if (assisted) {
			stats.assisted++;
			stats.streak = 0;
			word.dueAt = this.#asked + 3;
		} else {
			stats.wrong++;
			stats.streak = 0;
			this.#wrongKeys.add(word.row.key);
			word.level = 1;
			word.dueAt = this.#asked + 2;
		}
		word.hintLevel = 0;

		const judgement: Judgement = {
			correct: correct && !revealed,
			assisted,
			revealed,
			expected: expectedText(word.row, q.way),
			correctIndex: q.step === 'choice' ? q.correctIndex : undefined
		};
		this.#pending = judgement;
		return judgement;
	}

	#advance(): void {
		if (this.#final) {
			this.#finalDone = true;
			this.#final = false;
			this.#finished = true;
			return;
		}
		this.#roundIndex++;
		if (this.#roundIndex < this.#rounds.length) {
			this.#active = (this.#rounds[this.#roundIndex] ?? []).flatMap((k) => {
				const w = this.#words.get(k);
				return w ? [w] : [];
			});
			this.#question = {
				step: 'intro',
				round: this.#roundIndex + 1,
				words: this.#active.map((w) => ({ rowKey: w.row.key, prompt: w.row.prompt, answer: w.row.answers.join(', ') }))
			};
			return;
		}
		if (this.#finalEnabled && !this.#finalDone) {
			this.#final = true;
			this.#active = shuffle([...this.#words.values()], this.#rng);
			for (const w of this.#active) {
				w.level = 3;
				w.dueAt = 0;
				w.hintLevel = 0;
			}
			this.#pickQuestion();
			return;
		}
		this.#finished = true;
	}

	#pickQuestion(): void {
		const open = this.#active.filter((w) => w.level < 4);
		if (open.length === 0) {
			this.#question = null;
			this.#advance();
			return;
		}
		let candidates = open.filter((w) => w.row.key !== this.#lastKey);
		if (candidates.length === 0) candidates = open;
		const due = Math.min(...candidates.map((w) => w.dueAt));
		const pool = candidates.filter((w) => w.dueAt === due);
		const word = pool[Math.floor(this.#rng() * pool.length)] as Word;
		const way = this.#wayFor(word);

		if (word.level <= 1) {
			const others = this.#distractors(word, way);
			if (others) {
				const correct = expectedText(word.row, way);
				const options = shuffle([correct, ...others], this.#rng);
				this.#question = { step: 'choice', rowKey: word.row.key, way, shown: shownFor(word.row, way), options, correctIndex: options.indexOf(correct) };
				return;
			}
			word.level = 2; // no choice possible with so few words: go straight to typing
		}
		this.#question = { step: 'typed', rowKey: word.row.key, way, shown: shownFor(word.row, way), accepted: acceptedFor(word.row, way) };
	}
}

// ---------------------------------------------------------------- test session

export type VocabTestItem = {
	/** Always 0: vocabulary tests have no blocks (keeps the shape of the block test result). */
	blockIndex: number;
	rowKey: string;
	listTitle: string;
	way: VocabWay;
	shown: string;
	given: string;
	expected: string[];
	correct: boolean;
};

export type VocabTestResult = { total: number; correct: number; score: number; items: VocabTestItem[]; wrong: VocabTestItem[] };

export type VocabTestOptions = {
	rows: readonly PracticeRow[];
	direction: VocabDirection;
	rng?: Rng;
};

export class VocabTest {
	readonly mode = 'test' as const;

	#rows: Map<string, PracticeRow>;
	#order: { rowKey: string; way: VocabWay }[];
	#given: string[] = [];
	#index = 0;
	#result: VocabTestResult | null = null;
	#stats = new Map<string, RowStats>();

	constructor(options: VocabTestOptions) {
		this.#rows = new Map(options.rows.map((r) => [r.key, r]));
		const ways: VocabWay[] = options.direction === 'both' ? ['forward', 'reverse'] : [options.direction];
		const all = options.rows.flatMap((r) => ways.map((way) => ({ rowKey: r.key, way })));
		this.#order = shuffle(all, options.rng ?? Math.random);
		if (this.#order.length === 0) this.#result = this.#grade();
	}

	get finished(): boolean {
		return this.#result !== null;
	}
	get total(): number {
		return this.#order.length;
	}
	get index(): number {
		return this.#index;
	}
	get question(): { rowKey: string; way: VocabWay; shown: string } | null {
		const item = this.#order[this.#index];
		const row = item && this.#rows.get(item.rowKey);
		return item && row && !this.#result ? { rowKey: item.rowKey, way: item.way, shown: shownFor(row, item.way) } : null;
	}

	/** Stores the answer (empty = skipped) and moves to the next question. */
	answer(input: string): void {
		if (this.#result) return;
		this.#given[this.#index] = input;
		this.#index++;
		if (this.#index >= this.#order.length) this.#result = this.#grade();
	}

	/** Time is up or the learner hands in early: everything unanswered counts as wrong. */
	forceFinish(): VocabTestResult {
		return (this.#result ??= this.#grade());
	}

	finish(): VocabTestResult {
		return this.forceFinish();
	}

	wrongKeys(): string[] {
		return [...new Set(this.finish().wrong.map((i) => i.rowKey))];
	}

	drainDeltas(): RowProgressDelta[] {
		this.finish();
		const deltas = toProgressDeltas(this.#stats, this.#rows);
		this.#stats = new Map();
		return deltas;
	}

	#grade(): VocabTestResult {
		const items: VocabTestItem[] = this.#order.map((item, i) => {
			const row = this.#rows.get(item.rowKey) as PracticeRow;
			const given = this.#given[i] ?? '';
			const correct = given.trim() !== '' && checkVocab(given, row, item.way);
			const stats = this.#stats.get(item.rowKey) ?? { correct: 0, wrong: 0, assisted: 0, streak: 0 };
			if (correct) {
				stats.correct++;
				stats.streak++;
			} else {
				stats.wrong++;
				stats.streak = 0;
			}
			this.#stats.set(item.rowKey, stats);
			return { blockIndex: 0, rowKey: item.rowKey, listTitle: row.listTitle, way: item.way, shown: shownFor(row, item.way), given, expected: acceptedFor(row, item.way), correct };
		});
		const correct = items.filter((i) => i.correct).length;
		return { total: items.length, correct, score: items.length === 0 ? 0 : correct / items.length, items, wrong: items.filter((i) => !i.correct) };
	}
}
