// "Uitleggen" (phase 9): the learner explains a term in their own words, sees the official explanation from the syllabus
// and rates themselves; at the end the AI checks all answers in one request. Pure TS: no Svelte, DOM or network.
import { shuffle, type Rng } from './random';
import type { PracticeRow } from './types';

export type Rating = 'goed' | 'bijna' | 'niet';

export type ExplainItem = {
	/** Unique per term in the run. */
	key: string;
	term: string;
	/** The official explanation (from the syllabus catalogue, or what the learner typed for an own item). */
	reference: string;
	ref?: string;
	/** Keyboard of the set the row came from (the explanation itself is Dutch, but terms can be Greek). */
	greek: boolean;
};

export type AiVerdict = { verdict: Rating; feedback: string };

export type ExplainOutcome = { item: ExplainItem; answer: string; self: Rating | null; ai: AiVerdict | null };

export type BuildOptions = {
	/** How many terms to ask, null = all. */
	count: number | null;
	/** Official explanation for a catalogue ref, undefined when the ref is unknown (an own or removed item). */
	referenceOf: (ref: string) => string | undefined;
	rng?: Rng;
};

/** One item per term: all rows of a term (explanation, examples, AI questions) belong to the same item. */
export function buildExplainItems(rows: readonly PracticeRow[], options: BuildOptions): ExplainItem[] {
	const groups = new Map<string, PracticeRow[]>();
	for (const row of rows) {
		if (row.listKind !== 'concept' || row.answers.length === 0) continue;
		const term = row.answers[0]!;
		const key = row.ref ?? `own:${term.trim().toLowerCase()}`;
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	const items: ExplainItem[] = [];
	for (const [key, group] of groups) {
		const first = group[0]!;
		// An own item has no catalogue entry: its explanation is its first row that is not "sentence — translation".
		const own = group.find((r) => !r.prompt.includes(' — ')) ?? first;
		const reference = (first.ref ? options.referenceOf(first.ref) : undefined) ?? own.prompt;
		if (reference.trim() === '') continue;
		items.push({ key, term: first.answers[0]!, reference, ...(first.ref ? { ref: first.ref } : {}), greek: first.settings.keyboard === 'greek' });
	}
	const mixed = shuffle(items, options.rng ?? Math.random);
	return options.count === null ? mixed : mixed.slice(0, Math.max(0, options.count));
}

export class ExplainSession {
	readonly items: readonly ExplainItem[];
	#answers: string[] = [];
	#self: (Rating | null)[] = [];
	#ai: (AiVerdict | null)[];
	#index = 0;
	/** True between "controleer" and the self rating: the official explanation is on screen. */
	#revealed = false;

	constructor(items: readonly ExplainItem[]) {
		this.items = items;
		this.#ai = items.map(() => null);
	}

	get total(): number {
		return this.items.length;
	}
	get index(): number {
		return this.#index;
	}
	get finished(): boolean {
		return this.#index >= this.items.length;
	}
	get revealed(): boolean {
		return this.#revealed;
	}
	get current(): ExplainItem | null {
		return this.items[this.#index] ?? null;
	}

	/** Stores the learner's answer and shows the official explanation. An empty answer is allowed ("ik weet het niet"). */
	submit(answer: string): void {
		if (this.finished || this.#revealed) return;
		this.#answers[this.#index] = answer.trim();
		this.#revealed = true;
	}

	/** The learner's own verdict, then on to the next term. */
	rate(rating: Rating): void {
		if (this.finished || !this.#revealed) return;
		this.#self[this.#index] = rating;
		this.#revealed = false;
		this.#index++;
	}

	/** Items with an answer to send to the AI (blank answers are judged "niet" without asking). */
	toGrade(): { index: number; item: ExplainItem; answer: string }[] {
		return this.items.flatMap((item, index) => ((this.#answers[index] ?? '') === '' ? [] : [{ index, item, answer: this.#answers[index]! }]));
	}

	applyAi(results: readonly { index: number; verdict: Rating; feedback: string }[]): void {
		for (const result of results) if (result.index >= 0 && result.index < this.items.length) this.#ai[result.index] = { verdict: result.verdict, feedback: result.feedback };
		this.items.forEach((_, index) => {
			if ((this.#answers[index] ?? '') === '' && !this.#ai[index]) this.#ai[index] = { verdict: 'niet', feedback: 'Je hebt niets ingevuld.' };
		});
	}

	outcomes(): ExplainOutcome[] {
		return this.items.map((item, index) => ({ item, answer: this.#answers[index] ?? '', self: this.#self[index] ?? null, ai: this.#ai[index] ?? null }));
	}

	/** The AI verdict counts when there is one, else the learner's own rating. */
	summary(): { goed: number; bijna: number; niet: number; total: number; checkedByAi: boolean } {
		const counts = { goed: 0, bijna: 0, niet: 0 };
		let checkedByAi = false;
		for (const outcome of this.outcomes()) {
			const verdict = outcome.ai?.verdict ?? outcome.self ?? 'niet';
			if (outcome.ai) checkedByAi = true;
			counts[verdict]++;
		}
		return { ...counts, total: this.items.length, checkedByAi };
	}
}
