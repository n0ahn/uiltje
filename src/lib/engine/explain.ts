// "Uitleggen" (phase 9): the learner explains a term in their own words and sees the official explanation from the syllabus.
// The AI checks every answer right away: goed / bijna / niet. On "bijna" the learner decides; on "niet" the learner can object
// (the answer then counts as goed and the objection goes to the owner). A term that ends "niet" comes back later in the run.
// Pure TS: no Svelte, DOM or network.
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
	/** Strict AI check (accents and spelling of terms and examples count): from the set's setting, or the session choice. */
	strict: boolean;
	/** Keyboard of the set the row came from (the explanation itself is Dutch, but terms can be Greek). */
	greek: boolean;
};

export type AiVerdict = { verdict: Rating; feedback: string };

/** How one attempt ended: right (by the AI, or by the learner's own call on a "bijna"), wrong, or wrong by the AI but accepted after an objection. */
export type Resolution = 'goed' | 'niet' | 'bezwaar';
export type Attempt = { answer: string; ai: AiVerdict | null; resolution: Resolution | null };

/** A term that ended "niet" comes back after this many other terms (or at the end when fewer are left). */
export const REPEAT_GAP = 3;
/** Safety stop: a term is asked at most this many times, so a run always ends. */
export const MAX_ATTEMPTS = 3;

export type ExplainResult = { item: ExplainItem; attempts: readonly Attempt[]; solved: boolean; objected: boolean };

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
		items.push({ key, term: first.answers[0]!, reference, ...(first.ref ? { ref: first.ref } : {}), strict: first.settings.strictAccents, greek: first.settings.keyboard === 'greek' });
	}
	const mixed = shuffle(items, options.rng ?? Math.random);
	return options.count === null ? mixed : mixed.slice(0, Math.max(0, options.count));
}

export class ExplainSession {
	readonly items: readonly ExplainItem[];
	/** Item indexes still to ask; the first one is on screen. */
	#queue: number[];
	#attempts: Attempt[][];
	/** True between "laat zien" and "volgende": the official explanation is on screen and the last attempt of the current item is open. */
	#revealed = false;

	constructor(items: readonly ExplainItem[]) {
		this.items = items;
		this.#queue = items.map((_, index) => index);
		this.#attempts = items.map(() => []);
	}

	get total(): number {
		return this.items.length;
	}
	/** Distinct terms still to go, including the one on screen. */
	get remaining(): number {
		return this.#queue.length;
	}
	get finished(): boolean {
		return this.#queue.length === 0;
	}
	get revealed(): boolean {
		return this.#revealed;
	}
	get current(): ExplainItem | null {
		const index = this.#queue[0];
		return index === undefined ? null : (this.items[index] ?? null);
	}
	/** Earlier finished attempts of the current term: more than 0 means this is a repeat. */
	get tries(): number {
		const index = this.#queue[0];
		if (index === undefined) return 0;
		const made = this.#attempts[index]!.length;
		return this.#revealed ? made - 1 : made;
	}
	/** The open attempt (after "laat zien"), null while the learner is still typing. */
	get attempt(): Attempt | null {
		const index = this.#queue[0];
		if (index === undefined || !this.#revealed) return null;
		return this.#attempts[index]!.at(-1) ?? null;
	}

	/** Stores the learner's answer and shows the official explanation. An empty answer ("ik weet het niet") is judged "niet" without asking the AI. */
	submit(answer: string): void {
		const index = this.#queue[0];
		if (index === undefined || this.#revealed) return;
		const text = answer.trim();
		this.#attempts[index]!.push(text === '' ? { answer: '', ai: { verdict: 'niet', feedback: 'Je hebt niets ingevuld.' }, resolution: 'niet' } : { answer: text, ai: null, resolution: null });
		this.#revealed = true;
	}

	/** The AI's verdict for the open attempt. goed and niet settle it; bijna waits for the learner (`choose`). Ignored when the attempt already has a verdict. */
	applyVerdict(ai: AiVerdict): void {
		const attempt = this.attempt;
		if (!attempt || attempt.ai) return;
		attempt.ai = ai;
		attempt.resolution = ai.verdict === 'goed' ? 'goed' : ai.verdict === 'niet' ? 'niet' : null;
	}

	/** True when the AI is in doubt and the learner has to decide. */
	get needsChoice(): boolean {
		const attempt = this.attempt;
		return !!attempt && attempt.ai?.verdict === 'bijna' && attempt.resolution === null;
	}

	/** The learner's own call on a "bijna": was it right or not. */
	choose(correct: boolean): void {
		const attempt = this.attempt;
		if (!attempt || !this.needsChoice) return;
		attempt.resolution = correct ? 'goed' : 'niet';
	}

	/** An objection is possible against a "niet" of the AI on a real answer (not a blank one, not a "bijna" the learner decided). */
	get canObject(): boolean {
		const attempt = this.attempt;
		return !!attempt && attempt.ai?.verdict === 'niet' && attempt.answer !== '' && attempt.resolution === 'niet';
	}

	/** Call after the objection reached the owner: the attempt counts as goed. */
	acceptObjection(): void {
		const attempt = this.attempt;
		if (!attempt || !this.canObject) return;
		attempt.resolution = 'bezwaar';
	}

	/** The open attempt has an outcome, so the learner may go on. */
	get canContinue(): boolean {
		return this.attempt?.resolution != null;
	}

	/** The current term will be asked again later (it ended "niet" and has attempts left). */
	get willRepeat(): boolean {
		const index = this.#queue[0];
		const attempt = this.attempt;
		return index !== undefined && !!attempt && attempt.resolution === 'niet' && this.#attempts[index]!.length < MAX_ATTEMPTS;
	}

	/** Done with the explanation: on to the next term. A term that ended "niet" goes back into the queue. */
	next(): void {
		if (!this.canContinue) return;
		const repeat = this.willRepeat;
		const index = this.#queue.shift()!;
		this.#revealed = false;
		if (repeat) this.#queue.splice(Math.min(REPEAT_GAP, this.#queue.length), 0, index);
	}

	results(): ExplainResult[] {
		return this.items.map((item, index) => {
			const attempts = this.#attempts[index]!;
			const last = attempts.at(-1);
			return { item, attempts: attempts.map((a) => ({ ...a })), solved: last?.resolution === 'goed' || last?.resolution === 'bezwaar', objected: attempts.some((a) => a.resolution === 'bezwaar') };
		});
	}

	summary(): { total: number; firstTry: number; afterRepeat: number; unsolved: number; objections: number } {
		const summary = { total: this.items.length, firstTry: 0, afterRepeat: 0, unsolved: 0, objections: 0 };
		for (const result of this.results()) {
			if (!result.solved) summary.unsolved++;
			else if (result.attempts.length === 1) summary.firstTry++;
			else summary.afterRepeat++;
			if (result.objected) summary.objections++;
		}
		return summary;
	}
}
