// Pure search helpers for the command palette: no DOM, no Svelte.

/** [start, end) positions in the original title. */
export type Range = readonly [start: number, end: number];

/** Only the title and the keywords are searched; a subtitle is display-only (it would match too much, e.g. "onder de knie"). */
export type Searchable = { title: string; keywords?: string[] };

export type Ranked<T> = { item: T; score: number; ranges: Range[] };

export type Segment = { text: string; match: boolean };

/**
 * Lowercase and strip diacritics ("Dè" -> "de", polytonic "ὁ" -> "ο", final "ς" -> "σ").
 * The result has the same length as the input, so positions found in the folded text
 * are valid in the original text (needed for highlighting).
 */
export function fold(text: string): string {
	let out = '';
	for (const ch of text) {
		const base = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');
		out += base.length === ch.length ? base : ch;
	}
	return out;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordStart(text: string, index: number): boolean {
	return index === 0 || !WORD_CHAR.test(text.charAt(index - 1));
}

/** Best place of `token` in `text`: at the start (100) > at a word start (80) > anywhere (40). */
function findToken(text: string, token: string): { index: number; score: number } | null {
	let best: { index: number; score: number } | null = null;
	let from = 0;
	for (;;) {
		const index = text.indexOf(token, from);
		if (index === -1) return best;
		const score = index === 0 ? 100 : isWordStart(text, index) ? 80 : 40;
		if (!best || score > best.score) best = { index, score };
		from = index + 1;
	}
}

/** Typo-tolerant fallback: the letters of `token` appear in order ("ldcl" finds "latijn declinaties"). */
function findSubsequence(text: string, token: string): { indices: number[]; score: number } | null {
	if (token.length < 3) return null;
	const indices: number[] = [];
	let pos = 0;
	let prev = -2;
	let gaps = 0;
	let wordStarts = 0;
	for (const ch of token) {
		const index = text.indexOf(ch, pos);
		if (index === -1) return null;
		indices.push(index);
		if (index !== prev + 1) gaps++;
		if (isWordStart(text, index)) wordStarts++;
		prev = index;
		pos = index + ch.length;
	}
	// Always below a real substring match (40)
	return { indices, score: Math.min(35, Math.max(5, 25 + wordStarts * 4 - gaps * 3)) };
}

function scoreToken(title: string, rest: string, token: string): { score: number; ranges: Range[] } | null {
	const inTitle = findToken(title, token);
	if (inTitle) return { score: inTitle.score + 20, ranges: [[inTitle.index, inTitle.index + token.length]] };

	// Keywords count, but less, and there is nothing to highlight in the title
	const inRest = findToken(rest, token);
	if (inRest) return { score: inRest.score / 2, ranges: [] };

	const fuzzy = findSubsequence(title, token);
	if (fuzzy) return { score: fuzzy.score, ranges: fuzzy.indices.map((i): Range => [i, i + 1]) };

	return null;
}

function mergeRanges(ranges: readonly Range[]): Range[] {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const [start, end] of sorted) {
		const last = merged[merged.length - 1];
		if (last && start <= last[1]) last[1] = Math.max(last[1], end);
		else merged.push([start, end]);
	}
	return merged;
}

/**
 * Every word of the query must match (in the title or keywords). Best match first;
 * ties keep the input order, so the order in which items are listed is the priority.
 */
export function rank<T extends Searchable>(items: readonly T[], query: string): Ranked<T>[] {
	const tokens = fold(query).split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return items.map((item) => ({ item, score: 0, ranges: [] }));

	const whole = tokens.join(' ');
	const out: Ranked<T>[] = [];

	for (const item of items) {
		const title = fold(item.title);
		const rest = fold((item.keywords ?? []).join(' '));
		let score = 0;
		const ranges: Range[] = [];
		let matchesAll = true;

		for (const token of tokens) {
			const match = scoreToken(title, rest, token);
			if (!match) {
				matchesAll = false;
				break;
			}
			score += match.score;
			ranges.push(...match.ranges);
		}
		if (!matchesAll) continue;

		// A title that starts with the whole query is the most likely target
		if (title.startsWith(whole)) score += 30;
		out.push({ item, score, ranges: mergeRanges(ranges) });
	}

	return out.sort((a, b) => b.score - a.score);
}

/** Split `text` into plain and matched parts for highlighting. */
export function segments(text: string, ranges: readonly Range[]): Segment[] {
	const out: Segment[] = [];
	let pos = 0;
	for (const [start, end] of ranges) {
		if (start > pos) out.push({ text: text.slice(pos, start), match: false });
		out.push({ text: text.slice(start, end), match: true });
		pos = end;
	}
	if (pos < text.length) out.push({ text: text.slice(pos), match: false });
	return out.length > 0 ? out : [{ text, match: false }];
}